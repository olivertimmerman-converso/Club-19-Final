/**
 * Club 19 Sales OS - Sale Introducer Management API
 *
 * PUT /api/sales/[id]/introducer
 * Updates or adds an introducer to a sale
 *
 * DELETE /api/sales/[id]/introducer
 * Removes introducer from a sale
 *
 * Superadmin only endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import { getXataClient } from '@/src/xata';
import * as logger from '@/lib/logger';

/**
 * PUT - Update or add introducer to sale
 */
export async function PUT(
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
    const body = await request.json();
    const { introducerId } = body;

    if (!introducerId) {
      return NextResponse.json(
        { error: 'introducerId is required' },
        { status: 400 }
      );
    }

    const xata = getXataClient();

    // Verify introducer exists
    const introducer = await xata.db.Introducers.read(introducerId);
    if (!introducer) {
      return NextResponse.json(
        { error: 'Introducer not found' },
        { status: 404 }
      );
    }

    // Update sale record - link introducer only (commission will be added manually later)
    const updatedSale = await xata.db.Sales.update(id, {
      introducer: introducerId,
    });

    if (!updatedSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    logger.info('SALE_INTRODUCER', 'Introducer updated on sale', {
      saleId: id,
      introducerId,
      introducerName: introducer.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Introducer updated successfully',
      introducer: {
        id: introducer.id,
        name: introducer.name,
      },
    });
  } catch (error) {
    logger.error('SALE_INTRODUCER', 'Error updating introducer', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        error: 'Failed to update introducer',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove introducer from sale
 */
export async function DELETE(
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
    const xata = getXataClient();

    // Get current sale to check if introducer exists
    const currentSale = await xata.db.Sales.read(id);
    if (!currentSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Update sale record - remove introducer
    const updatedSale = await xata.db.Sales.update(id, {
      introducer: null,
    });

    logger.info('SALE_INTRODUCER', 'Introducer removed from sale', {
      saleId: id,
      previousIntroducerId: currentSale.introducer?.id
    });

    return NextResponse.json({
      success: true,
      message: 'Introducer removed successfully',
    });
  } catch (error) {
    logger.error('SALE_INTRODUCER', 'Error removing introducer', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        error: 'Failed to remove introducer',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
