import { Suspense } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  Await,
  useFetcher,
  useLoaderData,
  Form,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  SkeletonBodyText,
  Banner,
  Badge,
  Text,
} from "@shopify/polaris";
import { getInventory, claimStock } from "../models/inventory.server";

import type { Route } from "./+types/dashboard";

// Loader: Return promise directly for streaming (React Router 7 style)
export async function loader({ request }: LoaderFunctionArgs) {
  // Return promise directly - React Router 7 handles deferred loading automatically
  return {
    inventory: getInventory(), // Don't await! This enables streaming
  };
}

// Action: Handles "Claim One" button clicks
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const itemId = formData.get("itemId") as string;

  try {
    const updatedItem = await claimStock(itemId);
    return { success: true, item: updatedItem };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Inventory Row Component with Optimistic UI
function InventoryRow({ item }: { item: any }) {
  const fetcher = useFetcher();

  // Optimistic UI: Calculate stock based on pending form submission
  const isPending = fetcher.state !== "idle";
  const optimisticStock =
    fetcher.formData && fetcher.formData.get("itemId") === item.id
      ? Math.max(0, item.stock - 1) // Optimistically decrease
      : item.stock; // Use server data

  return [
    item.name,
    <Badge tone={optimisticStock > 0 ? "success" : "critical"}>
      {`${optimisticStock} in stock`}
    </Badge>,
    <fetcher.Form method="post">
      <input type="hidden" name="itemId" value={item.id} />
      <Button
        submit
        disabled={isPending || optimisticStock <= 0}
        loading={isPending}
        tone="success"
        size="slim"
      >
        Claim One
      </Button>
    </fetcher.Form>,
  ];
}

// Main Dashboard Component
export default function Dashboard() {
  const { inventory } = useLoaderData<typeof loader>();

  return (
    <Page title="Inventory Dashboard" subtitle="Warehouse Stock Management">
      <Layout>
        <Layout.Section>
          <Card>
            {/* Suspense with Skeleton for streaming */}
            <Suspense
              fallback={
                <div style={{ padding: "16px" }}>
                  <SkeletonBodyText lines={6} />
                </div>
              }
            >
              {/* Await resolves the deferred inventory promise */}
              <Await resolve={inventory}>
                {(resolvedInventory) => (
                  <DataTable
                    columnContentTypes={["text", "text", "text"]}
                    headings={["Product Name", "Stock Status", "Actions"]}
                    rows={resolvedInventory.map((item: any) =>
                      InventoryRow({ item })
                    )}
                  />
                )}
              </Await>
            </Suspense>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

// Route-level Error Boundary
export function ErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <Page title="Inventory Dashboard" subtitle="Warehouse Stock Management">
      <Layout>
        <Layout.Section>
          <Banner
            title="Error Loading Inventory"
            tone="critical"
            onDismiss={undefined}
          >
            <p>{errorMessage}</p>
            <div style={{ marginTop: "12px" }}>
              {/* Retry button re-triggers loader without full page refresh */}
              <Form method="get">
                <Button submit tone="critical">
                  Retry
                </Button>
              </Form>
            </div>
          </Banner>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
