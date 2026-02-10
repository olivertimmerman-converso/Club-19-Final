/**
 * Club 19 Sales OS - Fix VAT Calculation API
 *
 * POST /api/sales/[id]/fix-vat
 * Recalculates VAT amounts based on branding_theme for a sale record
 *
 * This endpoint:
 * 1. Gets the sale record
 * 2. Looks up the branding theme mapping
 * 3. Recalculates sale_amount_inc_vat based on expectedVAT rate
 * 4. Updates the sale record
 * 5. Returns the updated amounts
 *
 * Superadmin only endpoint
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import { getBrandingThemeMapping } from '@/lib/branding-theme-mappings';
import { calculateVAT, validateSaleVAT } from '@/lib/calculations/vat';
import * as logger from '@/lib/logger';

// Drizzle imports
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from '@/src/xata';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify superadmin role
    const role = await getUserRole();
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden: Superadmin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ORIGINAL XATA:
    // const xata = getXataClient();
    // const sale = await xata.db.Sales.read(id);

    // DRIZZLE:
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, id))
      .limit(1);

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    logger.info('FIX_VAT', 'Starting VAT recalculation', {
      saleId: id,
      saleReference: sale.saleReference,
      brandingTheme: sale.brandingTheme,
      currentExVat: sale.saleAmountExVat,
      currentIncVat: sale.saleAmountIncVat
    });

    // Get branding theme mapping
    const brandingThemeMapping = getBrandingThemeMapping(sale.brandingTheme || null);

    if (!brandingThemeMapping) {
      logger.warn('FIX_VAT', 'Branding theme not recognized', {
        brandingTheme: sale.brandingTheme
      });
      return NextResponse.json(
        {
          error: 'Unknown branding theme',
          brandingTheme: sale.brandingTheme,
          message: 'Cannot determine correct VAT rate for this branding theme'
        },
        { status: 400 }
      );
    }

    // First, validate current VAT to detect the bug
    const validation = validateSaleVAT(
      sale.brandingTheme || '',
      sale.saleAmountExVat,
      sale.saleAmountIncVat
    );

    logger.info('FIX_VAT', 'Current VAT validation', {
      isValid: validation.isValid,
      expectedVATRate: validation.expectedVATRate,
      actualVATAmount: validation.actualVATAmount,
      expectedVATAmount: validation.expectedVATAmount,
      discrepancy: validation.discrepancy,
    });

    const vatRate = brandingThemeMapping.expectedVAT;

    // Calculate correct VAT amounts
    let saleAmountExVat: number;
    let saleAmountIncVat: number;
    let vatAmount: number;

    if (vatRate === 0) {
      // Zero-rated (export/margin scheme): inc VAT = ex VAT (no VAT)
      //
      // Special case: If the record was created with the bug, it has:
      // - sale_amount_inc_vat = user's entered amount (the true total, e.g., £68,000)
      // - sale_amount_ex_vat = inc_vat / 1.2 (incorrectly calculated, e.g., £56,667)
      //
      // To detect this, check if inc_vat ≈ ex_vat * 1.2
      const currentIncVat = sale.saleAmountIncVat || 0;
      const currentExVat = sale.saleAmountExVat || 0;
      const looksLikeBug = Math.abs(currentIncVat - currentExVat * 1.2) < 1;

      if (looksLikeBug) {
        // Bug detected: inc_vat has the correct total, ex_vat was wrongly calculated
        // The user entered inc_vat as the sale price (which for 0% VAT IS the ex_vat amount)
        saleAmountExVat = currentIncVat; // User's original input
        saleAmountIncVat = currentIncVat; // Same for 0% VAT
        vatAmount = 0;
        logger.info('FIX_VAT', 'Detected VAT bug - using inc_vat as base', {
          originalIncVat: currentIncVat,
          originalExVat: currentExVat,
          correctedBoth: saleAmountIncVat
        });
      } else {
        // Use the VAT utility to recalculate properly
        const vatResult = calculateVAT({
          brandTheme: sale.brandingTheme || '',
          saleAmountExVat: currentExVat,
        });
        saleAmountExVat = vatResult.saleAmountExVat;
        saleAmountIncVat = vatResult.saleAmountIncVat;
        vatAmount = vatResult.vatAmount;
      }
    } else {
      // Standard rate: use the VAT utility
      const currentExVat = sale.saleAmountExVat || 0;
      const vatResult = calculateVAT({
        brandTheme: sale.brandingTheme || '',
        saleAmountExVat: currentExVat,
      });
      saleAmountExVat = vatResult.saleAmountExVat;
      saleAmountIncVat = vatResult.saleAmountIncVat;
      vatAmount = vatResult.vatAmount;
    }

    logger.info('FIX_VAT', 'VAT recalculated', {
      themeName: brandingThemeMapping.name,
      vatRate,
      saleAmountExVat,
      saleAmountIncVat,
      vatAmount,
      changed: Math.abs((sale.saleAmountIncVat || 0) - saleAmountIncVat) > 0.01
    });

    // Update the sale record (update both ex_vat and inc_vat for zero-rated sales)
    // ORIGINAL XATA:
    // const updatedSale = await xata.db.Sales.update(id, {
    //   sale_amount_ex_vat: saleAmountExVat,
    //   sale_amount_inc_vat: saleAmountIncVat,
    // });

    // DRIZZLE:
    const [updatedSale] = await db
      .update(sales)
      .set({
        saleAmountExVat: saleAmountExVat,
        saleAmountIncVat: saleAmountIncVat,
      })
      .where(eq(sales.id, id))
      .returning();

    logger.info('FIX_VAT', 'Sale updated successfully', {
      saleId: id,
      oldIncVat: sale.saleAmountIncVat,
      newIncVat: saleAmountIncVat
    });

    return NextResponse.json({
      success: true,
      saleId: id,
      saleReference: sale.saleReference,
      brandingTheme: {
        id: sale.brandingTheme,
        name: brandingThemeMapping.name,
        accountCode: brandingThemeMapping.accountCode,
      },
      vatCalculation: {
        vatRate,
        saleAmountExVat,
        saleAmountIncVat,
        vatAmount,
      },
      changes: {
        oldIncVat: sale.saleAmountIncVat,
        newIncVat: saleAmountIncVat,
        difference: saleAmountIncVat - (sale.saleAmountIncVat || 0),
      },
    });
  } catch (error) {
    logger.error('FIX_VAT', 'Error fixing VAT', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        error: 'Failed to fix VAT',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
