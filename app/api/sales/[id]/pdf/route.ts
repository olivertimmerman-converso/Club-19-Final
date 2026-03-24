/**
 * Club 19 Sales OS - Invoice PDF Download
 *
 * GET /api/sales/[id]/pdf
 * Proxies the Xero invoice PDF using the system-user OAuth token.
 * No Xero login required from the end user.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getValidTokens } from "@/lib/xero-auth";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up the sale to get the Xero invoice ID and status
    const sale = await db
      .select({
        xeroInvoiceId: sales.xeroInvoiceId,
        xeroInvoiceNumber: sales.xeroInvoiceNumber,
        invoiceStatus: sales.invoiceStatus,
      })
      .from(sales)
      .where(eq(sales.id, id))
      .limit(1);

    if (!sale[0]) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const { xeroInvoiceId, xeroInvoiceNumber, invoiceStatus } = sale[0];

    if (!xeroInvoiceId) {
      return NextResponse.json(
        { error: "This sale has no linked Xero invoice" },
        { status: 404 }
      );
    }

    // PDF is only available for AUTHORISED or PAID invoices
    if (invoiceStatus === "DRAFT") {
      return NextResponse.json(
        {
          error:
            "PDF not available — invoice must be approved in Xero before it can be downloaded",
        },
        { status: 400 }
      );
    }

    // Get Xero tokens via the integration user
    const integrationUserId = process.env.XERO_INTEGRATION_CLERK_USER_ID;
    if (!integrationUserId) {
      logger.error("SALES_PDF", "XERO_INTEGRATION_CLERK_USER_ID not configured");
      return NextResponse.json(
        { error: "Xero integration not configured" },
        { status: 500 }
      );
    }

    const tokens = await getValidTokens(integrationUserId);
    if (!tokens) {
      return NextResponse.json(
        { error: "Xero is not connected — please contact support" },
        { status: 500 }
      );
    }

    logger.info("SALES_PDF", "Fetching PDF from Xero", {
      saleId: id,
      xeroInvoiceId,
      xeroInvoiceNumber,
    });

    // Fetch the PDF from Xero
    const xeroResponse = await fetch(
      `https://api.xero.com/api.xro/2.0/Invoices/${xeroInvoiceId}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Xero-Tenant-Id": tokens.tenantId,
          Accept: "application/pdf",
        },
      }
    );

    if (!xeroResponse.ok) {
      const errorText = await xeroResponse.text();
      logger.error("SALES_PDF", "Xero PDF fetch failed", {
        saleId: id,
        xeroInvoiceId,
        status: xeroResponse.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: "Failed to retrieve PDF from Xero" },
        { status: 502 }
      );
    }

    const filename = xeroInvoiceNumber
      ? `Club19-${xeroInvoiceNumber}.pdf`
      : `Club19-${id}.pdf`;

    logger.info("SALES_PDF", "Streaming PDF to client", {
      saleId: id,
      filename,
    });

    // Stream the PDF back
    return new NextResponse(xeroResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    logger.error("SALES_PDF", "Unexpected error", { saleId: id, error: error.message });
    return NextResponse.json(
      { error: "Failed to download PDF" },
      { status: 500 }
    );
  }
}
