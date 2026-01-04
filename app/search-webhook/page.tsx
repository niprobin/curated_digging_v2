"use client";

import { useState } from "react";
import { useWebhookGet } from "@/hooks/use-webhook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const WEBHOOK_URL = "https://n8n.niprobin.com/webhook-test/search";

export default function SearchWebhookPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [responseData, setResponseData] = useState<unknown | null>(null);

  const { trigger, isLoading, error } = useWebhookGet<{ query: string }, unknown>(
    WEBHOOK_URL,
    {
      onSuccess: (data) => {
        setResponseData(data);
      },
      onError: (err) => {
        console.error("Webhook error:", err);
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      await trigger({ query: searchQuery });
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Search Webhook</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Search using the webhook endpoint and view raw response data.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>
            Enter a search query to trigger the webhook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter search query..."
                className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto text-sm text-destructive">
              {error.message}
            </pre>
          </CardContent>
        </Card>
      )}

      {responseData && (
        <Card>
          <CardHeader>
            <CardTitle>Response Data</CardTitle>
            <CardDescription>Raw response from the webhook</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
              {JSON.stringify(responseData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
