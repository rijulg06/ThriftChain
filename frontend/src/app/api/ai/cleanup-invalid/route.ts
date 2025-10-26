/**
 * Cleanup Invalid Supabase Entries API
 *
 * DELETE /api/ai/cleanup-invalid
 *
 * PURPOSE:
 * Remove entries from Supabase where the sui_object_id doesn't exist on the blockchain.
 * This is useful after fixing bugs where incorrect IDs were stored.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { suiClient } from '@/lib/sui/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function DELETE(request: NextRequest) {
  try {
    console.log('[cleanup] Starting cleanup of invalid Supabase entries...');

    // Step 1: Get all entries from Supabase
    const { data: allEntries, error: fetchError } = await supabaseAdmin
      .from('item_search_index')
      .select('sui_object_id');

    if (fetchError) {
      throw new Error(`Failed to fetch entries: ${fetchError.message}`);
    }

    if (!allEntries || allEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No entries found in Supabase',
        removed: 0,
        checked: 0,
      });
    }

    console.log(`[cleanup] Found ${allEntries.length} entries to check`);

    // Step 2: Check each entry against the blockchain
    const invalidIds: string[] = [];
    let checked = 0;

    for (const entry of allEntries) {
      checked++;
      const objectId = entry.sui_object_id;

      try {
        // Try to get the object from blockchain
        const response = await suiClient.getObject({
          id: objectId,
          options: {
            showContent: true,
          },
        });

        // If object doesn't exist or has been deleted, mark as invalid
        if (!response.data || response.error) {
          console.log(`[cleanup] ❌ Invalid ID: ${objectId}`);
          invalidIds.push(objectId);
        } else {
          console.log(`[cleanup] ✅ Valid ID: ${objectId}`);
        }
      } catch (error) {
        // If error fetching, assume it's invalid
        console.log(`[cleanup] ❌ Error checking ${objectId}:`, error);
        invalidIds.push(objectId);
      }

      // Add a small delay to avoid overwhelming the RPC
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[cleanup] Found ${invalidIds.length} invalid entries out of ${checked} checked`);

    // Step 3: Delete invalid entries
    if (invalidIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('item_search_index')
        .delete()
        .in('sui_object_id', invalidIds);

      if (deleteError) {
        throw new Error(`Failed to delete entries: ${deleteError.message}`);
      }

      console.log(`[cleanup] ✅ Deleted ${invalidIds.length} invalid entries`);
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete! Removed ${invalidIds.length} invalid entries`,
      removed: invalidIds.length,
      checked: checked,
      invalidIds: invalidIds,
    });
  } catch (error) {
    console.error('[cleanup] Error:', error);

    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check status without deleting
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[cleanup] Checking for invalid entries (dry run)...');

    // Get all entries from Supabase
    const { data: allEntries, error: fetchError } = await supabaseAdmin
      .from('item_search_index')
      .select('sui_object_id, indexed_at');

    if (fetchError) {
      throw new Error(`Failed to fetch entries: ${fetchError.message}`);
    }

    if (!allEntries || allEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No entries found in Supabase',
        total: 0,
        invalid: 0,
        valid: 0,
      });
    }

    console.log(`[cleanup] Found ${allEntries.length} entries to check`);

    // Check each entry (without deleting)
    const invalidIds: string[] = [];
    const validIds: string[] = [];

    for (const entry of allEntries) {
      const objectId = entry.sui_object_id;

      try {
        const response = await suiClient.getObject({
          id: objectId,
          options: {
            showContent: true,
          },
        });

        if (!response.data || response.error) {
          invalidIds.push(objectId);
        } else {
          validIds.push(objectId);
        }
      } catch (error) {
        invalidIds.push(objectId);
      }

      // Add a small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      message: `Found ${invalidIds.length} invalid entries out of ${allEntries.length} total`,
      total: allEntries.length,
      valid: validIds.length,
      invalid: invalidIds.length,
      invalidIds: invalidIds,
      validIds: validIds,
    });
  } catch (error) {
    console.error('[cleanup] Error:', error);

    return NextResponse.json(
      {
        error: 'Check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
