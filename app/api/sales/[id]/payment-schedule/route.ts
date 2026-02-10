/**
 * Club 19 Sales OS - Payment Schedule API
 *
 * GET /api/sales/[id]/payment-schedule
 * Fetch all payment instalments for a sale
 *
 * POST /api/sales/[id]/payment-schedule
 * Create payment plan with instalments
 *
 * DELETE /api/sales/[id]/payment-schedule
 * Remove payment plan and all instalments
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Drizzle imports
import { db } from "@/db";
import { sales, paymentSchedule } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

// ORIGINAL XATA:
// import { XataClient } from '@/src/xata';
// const xata = new XataClient();

/**
 * GET /api/sales/[id]/payment-schedule
 * Fetch all payment instalments for a sale
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: saleId } = await params;

    // ORIGINAL XATA:
    // const instalments = await xata.db.PaymentSchedule
    //   .filter({ 'sale.id': saleId })
    //   .sort('instalment_number', 'asc')
    //   .getAll();

    // DRIZZLE:
    const instalments = await db
      .select()
      .from(paymentSchedule)
      .where(eq(paymentSchedule.saleId, saleId))
      .orderBy(asc(paymentSchedule.instalmentNumber));

    return NextResponse.json({
      success: true,
      instalments: instalments.map(inst => ({
        id: inst.id,
        instalment_number: inst.instalmentNumber,
        due_date: inst.dueDate,
        amount: inst.amount,
        status: inst.status,
        paid_date: inst.paidDate,
        xero_invoice_id: inst.xeroInvoiceId,
        xero_invoice_number: inst.xeroInvoiceNumber,
        notes: inst.notes,
      })),
    });
  } catch (error) {
    console.error('Error fetching payment schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment schedule' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales/[id]/payment-schedule
 * Create payment plan with instalments
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: saleId } = await params;
    const body = await req.json();

    // Validate request body
    if (!body.instalments || !Array.isArray(body.instalments)) {
      return NextResponse.json(
        { error: 'Invalid request: instalments array required' },
        { status: 400 }
      );
    }

    // ORIGINAL XATA:
    // const sale = await xata.db.Sales.read(saleId);

    // DRIZZLE:
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // ORIGINAL XATA:
    // const createdInstalments = [];
    // for (const instalment of body.instalments) {
    //   const created = await xata.db.PaymentSchedule.create({
    //     sale: saleId,
    //     instalment_number: instalment.instalment_number,
    //     due_date: instalment.due_date ? new Date(instalment.due_date) : undefined,
    //     amount: instalment.amount,
    //     status: instalment.status || 'scheduled',
    //     paid_date: instalment.paid_date ? new Date(instalment.paid_date) : undefined,
    //     xero_invoice_id: instalment.xero_invoice_id,
    //     xero_invoice_number: instalment.xero_invoice_number,
    //     notes: instalment.notes,
    //   });
    //   createdInstalments.push(created);
    // }

    // DRIZZLE:
    const instalmentValues = body.instalments.map((instalment: any) => ({
      saleId: saleId,
      instalmentNumber: instalment.instalment_number,
      dueDate: instalment.due_date ? new Date(instalment.due_date) : undefined,
      amount: instalment.amount,
      status: instalment.status || 'scheduled',
      paidDate: instalment.paid_date ? new Date(instalment.paid_date) : undefined,
      xeroInvoiceId: instalment.xero_invoice_id,
      xeroInvoiceNumber: instalment.xero_invoice_number,
      notes: instalment.notes,
    }));

    const createdInstalments = await db
      .insert(paymentSchedule)
      .values(instalmentValues)
      .returning();

    // ORIGINAL XATA:
    // await xata.db.Sales.update(saleId, {
    //   is_payment_plan: true,
    //   payment_plan_instalments: body.instalments.length,
    // });

    // DRIZZLE:
    await db
      .update(sales)
      .set({
        isPaymentPlan: true,
        paymentPlanInstalments: body.instalments.length,
      })
      .where(eq(sales.id, saleId));

    return NextResponse.json({
      success: true,
      message: 'Payment plan created successfully',
      instalments: createdInstalments,
    });
  } catch (error) {
    console.error('Error creating payment schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create payment schedule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sales/[id]/payment-schedule
 * Remove payment plan and all instalments
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: saleId } = await params;

    // ORIGINAL XATA:
    // const instalments = await xata.db.PaymentSchedule
    //   .filter({ 'sale.id': saleId })
    //   .getAll();
    // for (const instalment of instalments) {
    //   await xata.db.PaymentSchedule.delete(instalment.id);
    // }

    // DRIZZLE:
    // First get count of instalments to be deleted
    const instalments = await db
      .select({ id: paymentSchedule.id })
      .from(paymentSchedule)
      .where(eq(paymentSchedule.saleId, saleId));

    // Delete all payment schedule records for this sale
    await db
      .delete(paymentSchedule)
      .where(eq(paymentSchedule.saleId, saleId));

    // ORIGINAL XATA:
    // await xata.db.Sales.update(saleId, {
    //   is_payment_plan: false,
    //   payment_plan_instalments: null,
    // });

    // DRIZZLE:
    await db
      .update(sales)
      .set({
        isPaymentPlan: false,
        paymentPlanInstalments: null,
      })
      .where(eq(sales.id, saleId));

    return NextResponse.json({
      success: true,
      message: 'Payment plan removed successfully',
      deletedCount: instalments.length,
    });
  } catch (error) {
    console.error('Error deleting payment schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment schedule' },
      { status: 500 }
    );
  }
}
