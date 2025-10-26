'use client';

import { useState } from 'react';
import { suiClient } from '@/lib/sui/client';

export default function DebugPage() {
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const checkMarketplace = async () => {
    setLoading(true);
    setOutput('');
    try {
      const MARKETPLACE_ID = process.env.NEXT_PUBLIC_MARKETPLACE_ID!;
      const PACKAGE_ID = process.env.NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID!;

      let logs = [];
      logs.push(`📦 Package ID: ${PACKAGE_ID}`);
      logs.push(`🏪 Marketplace ID: ${MARKETPLACE_ID}`);
      logs.push('');

      // Fetch marketplace object
      logs.push('Fetching marketplace object...');
      const marketplaceObj = await suiClient.getObject({
        id: MARKETPLACE_ID,
        options: {
          showContent: true,
          showType: true,
        },
      });

      logs.push('Marketplace object:');
      logs.push(JSON.stringify(marketplaceObj, null, 2));
      logs.push('');

      // Extract table IDs
      const content = marketplaceObj.data?.content;
      if (content && content.dataType === 'moveObject') {
        const fields = content.fields as any;
        logs.push(`Items table ID: ${fields.items?.fields?.id?.id}`);
        logs.push(`Item counter: ${fields.item_counter}`);
        logs.push(`Offer counter: ${fields.offer_counter}`);
        logs.push(`Escrow counter: ${fields.escrow_counter}`);
        logs.push('');

        // Try to get dynamic fields from items table
        const itemsTableId = fields.items?.fields?.id?.id;
        if (itemsTableId) {
          logs.push('Fetching dynamic fields from items table...');
          const dynamicFields = await suiClient.getDynamicFields({
            parentId: itemsTableId,
            limit: 50,
          });

          logs.push(`Found ${dynamicFields.data.length} dynamic fields in items table`);
          logs.push('');

          // Fetch and display each item
          for (let i = 0; i < dynamicFields.data.length; i++) {
            const field = dynamicFields.data[i];
            logs.push(`--- Item ${i + 1} ---`);
            logs.push(`Dynamic Field Object ID: ${field.objectId}`);
            logs.push(`Name Type: ${field.name.type}`);
            logs.push(`Name Value (Item ID): ${field.name.value}`);

            try {
              const itemObj = await suiClient.getDynamicFieldObject({
                parentId: itemsTableId,
                name: field.name,
              });

              if (itemObj.data?.content && itemObj.data.content.dataType === 'moveObject') {
                const itemFields = (itemObj.data.content.fields as any).value?.fields;
                logs.push(`Title: ${itemFields.title}`);
                logs.push(`Price: ${itemFields.price} MIST`);
                logs.push(`Seller: ${itemFields.seller}`);
                logs.push(`Status: ${itemFields.status}`);
                logs.push(`Created: ${new Date(parseInt(itemFields.created_at)).toLocaleString()}`);
              }
            } catch (err) {
              logs.push(`Error fetching item: ${err}`);
            }
            logs.push('');
          }
        }
      }

      setOutput(logs.join('\n'));
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}\n\nStack: ${error instanceof Error ? error.stack : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Marketplace Debug Tool</h1>

        <button
          onClick={checkMarketplace}
          disabled={loading}
          className="retro-btn px-6 py-3 mb-6"
        >
          {loading ? 'Loading...' : 'Check Marketplace State'}
        </button>

        {output && (
          <pre className="retro-card p-4 overflow-auto text-xs whitespace-pre-wrap">
            {output}
          </pre>
        )}
      </div>
    </div>
  );
}
