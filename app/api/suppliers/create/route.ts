/**
 * Club 19 Sales OS - Create Supplier API
 *
 * POST endpoint to create a new Supplier
 * Used by Deal Studio and Adopt Invoice when supplier doesn't exist
 *
 * Auto-approves for superadmin/admin/operations roles.
 * Shoppers' suppliers are marked as pending_approval.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as logger from "@/lib/logger";
import { toTitleCase } from "@/lib/utils/normalise";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userRole = (user.publicMetadata as { staffRole?: string })?.staffRole || 'shopper';

    // Parse request body
    const body = await request.json();
    const { name, email } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    // Normalise to Title Case and check for duplicate
    const normalizedName = toTitleCase(name);
    const existingResults = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.name, normalizedName))
      .limit(1);
    const existing = existingResults[0] || null;

    if (existing) {
      // Return the existing supplier instead of creating a duplicate
      return NextResponse.json(
        {
          success: true,
          supplier: {
            id: existing.id,
            name: existing.name,
            email: existing.email,
            pending_approval: existing.pendingApproval || false,
          },
          message: "Supplier already exists",
        },
        { status: 200 }
      );
    }

    // Auto-approve for privileged roles
    const privilegedRoles = ['superadmin', 'admin', 'operations'];
    const autoApprove = privilegedRoles.includes(userRole);

    // Create the supplier
    const [supplier] = await db
      .insert(suppliers)
      .values({
        name: normalizedName,
        email: email?.trim() || null,
        pendingApproval: !autoApprove,
        createdBy: userId,
        approvedBy: autoApprove ? userId : null,
        approvedAt: autoApprove ? new Date() : null,
      })
      .returning();

    logger.info('SUPPLIER_CREATE', 'Created new supplier', {
      id: supplier.id,
      name: supplier.name,
      createdBy: userId,
      userRole,
      autoApprove,
      pending_approval: !autoApprove,
    });

    return NextResponse.json(
      {
        success: true,
        supplier: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          pending_approval: !autoApprove,
        },
        message: autoApprove
          ? "Supplier created and approved"
          : "Supplier created - pending approval",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("SUPPLIER_CREATE", "Error creating supplier", { error: error as any });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
