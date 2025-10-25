import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/walrus/upload
 * 
 * NOTE: This endpoint is a placeholder for server-side upload coordination.
 * In practice, Walrus uploads should be done CLIENT-SIDE because they require:
 * 1. User's wallet signer
 * 2. Transaction signing
 * 3. Direct connection to Walrus network
 * 
 * For now, this endpoint just validates files and returns metadata.
 * The actual upload happens in the frontend using the wallet.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Return file metadata for client-side upload
    return NextResponse.json({
      success: true,
      message: 'File validated. Upload should be done client-side with wallet.',
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
      }
    })

  } catch (error) {
    console.error('Error validating file:', error)
    return NextResponse.json(
      { 
        error: 'Failed to validate file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
