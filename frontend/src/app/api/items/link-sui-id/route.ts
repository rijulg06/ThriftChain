/**
 * API Route: Link Supabase record with Sui object ID
 *
 * POST /api/items/link-sui-id
 *
 * This route handles updating the temporary Supabase record with the real
 * sui_object_id after blockchain transaction completes.
 *
 * Requires admin privileges to bypass RLS when updating PRIMARY KEY.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tempId, sui_object_id } = body

    // Validate inputs
    if (!tempId || !sui_object_id) {
      return NextResponse.json(
        { error: 'Missing required fields: tempId, sui_object_id' },
        { status: 400 }
      )
    }

    // Get admin client to bypass RLS
    const adminClient = getSupabaseAdminClient()

    // Fetch the temp record
    const { data: oldData, error: fetchError } = await adminClient
      .from('item_search_index')
      .select('*')
      .eq('sui_object_id', tempId)
      .single()

    if (fetchError || !oldData) {
      console.error('Error fetching temp item record:', fetchError)
      return NextResponse.json(
        { error: 'Temp record not found', details: fetchError?.message },
        { status: 404 }
      )
    }

    // Delete temp record (can't update PRIMARY KEY)
    const { error: deleteError } = await adminClient
      .from('item_search_index')
      .delete()
      .eq('sui_object_id', tempId)

    if (deleteError) {
      console.error('Error deleting temp item record:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete temp record', details: deleteError.message },
        { status: 500 }
      )
    }

    // Insert new record with correct sui_object_id (preserve all other fields)
    const { data, error: insertError } = await adminClient
      .from('item_search_index')
      .insert({
        ...oldData,
        sui_object_id, // Update to real blockchain ID
        time: new Date().toISOString(), // Update timestamp
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting updated item record:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert updated record', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Exception in link-sui-id API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
