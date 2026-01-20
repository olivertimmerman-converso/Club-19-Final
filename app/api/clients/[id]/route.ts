/**
 * Club 19 Sales OS - Single Client API
 *
 * GET: Fetch single client by ID with owner details
 * PATCH: Update client fields (owner assignment - superadmin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import { getXataClient } from '@/src/xata';
import * as logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clients/[id]
 * Fetch a single client by ID with owner details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    logger.info('CLIENTS_API', 'Fetching client', { clientId: id });

    const xata = getXataClient();
    const client = await xata.db.Buyers
      .select(['*', 'owner.id', 'owner.name'])
      .filter({ id })
      .getFirst();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    logger.error('CLIENTS_API', 'Error fetching client', { error: error as any });
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients/[id]
 * Update client fields (owner assignment)
 * Only superadmin can update owner
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getUserRole();
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - requires superadmin role' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    logger.info('CLIENTS_API', 'Update client request', { clientId: id, fields: Object.keys(body) });

    const xata = getXataClient();

    // Build update object from allowed fields
    const updateData: Record<string, any> = {};

    // Handle owner assignment (link field)
    if (body.owner !== undefined) {
      updateData.owner = body.owner || null;
      // Track when and who changed the owner
      updateData.owner_changed_at = new Date();
      updateData.owner_changed_by = userId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    logger.info('CLIENTS_API', 'Updating client', { clientId: id, updateFields: Object.keys(updateData) });

    // Note: owner, owner_changed_at, owner_changed_by fields must be added to Xata schema
    const updatedClient = await xata.db.Buyers.update(id, updateData as any);

    if (!updatedClient) {
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      );
    }

    logger.info('CLIENTS_API', 'Client updated successfully', {
      clientId: id,
      newOwnerId: body.owner || null,
    });

    return NextResponse.json({
      success: true,
      client: updatedClient,
    });
  } catch (error) {
    logger.error('CLIENTS_API', 'Error updating client', { error: error as any });
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}
