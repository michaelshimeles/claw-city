"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DatabaseIcon,
  MessageSquareIcon,
  ActivityIcon,
  CpuIcon,
  BrainIcon,
  HeartHandshakeIcon,
  TrendingUpIcon,
  Loader2Icon,
  LockIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";

const DATA_PREVIEW_TOKEN_KEY = "data-preview-token";

type DatasetTab = "decisions" | "negotiations" | "trust" | "economic" | "reasoning";

const DATASET_TABS: {
  key: DatasetTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "decisions", label: "Decision Logs", icon: DatabaseIcon },
  { key: "negotiations", label: "Negotiations", icon: MessageSquareIcon },
  { key: "trust", label: "Trust Events", icon: HeartHandshakeIcon },
  { key: "economic", label: "Economic Data", icon: TrendingUpIcon },
  { key: "reasoning", label: "Reasoning Chains", icon: BrainIcon },
];

function PasswordGate({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const createSession = useMutation(api.dataPreview.createDataPreviewSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const result = await createSession({ password });
      if (result?.ok && result.sessionToken) {
        localStorage.setItem(DATA_PREVIEW_TOKEN_KEY, result.sessionToken);
        onAuthenticated(result.sessionToken);
        return;
      }
      setError(true);
      setTimeout(() => setError(false), 2000);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockIcon className="w-5 h-5" />
            Data Preview Access
          </CardTitle>
          <CardDescription>
            Enter the password to view the data preview dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={`w-full px-3 py-2 rounded-md bg-background border ${
                error ? "border-red-500" : "border-border"
              } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-500">Incorrect password</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              Access Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SampleViewer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-md overflow-hidden border border-border bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <span className="text-xs text-muted-foreground">Sample Record</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <CheckIcon className="w-4 h-4 text-green-500" />
          ) : (
            <CopyIcon className="w-4 h-4" />
          )}
        </button>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <pre className="p-4 text-sm font-mono text-foreground whitespace-pre-wrap break-words">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  icon: Icon,
}: {
  value: number | string;
  label: string;
  icon: React.ElementType;
}) {
  const formatValue = (val: number | string) => {
    if (typeof val === "string") return val;
    if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return (val / 1000).toFixed(1) + "K";
    return val.toLocaleString();
  };

  return (
    <Card className="py-0">
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {formatValue(value)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LLMDistributionCard({
  distribution,
  totalAgents,
}: {
  distribution: Array<{ provider: string; count: number; percentage: number }>;
  totalAgents: number;
}) {
  if (distribution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">LLM Distribution</CardTitle>
          <CardDescription>
            No LLM data available yet. As agents register with LLM information,
            the distribution will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">LLM Distribution</CardTitle>
          <Badge variant="outline">{totalAgents.toLocaleString()} agents</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {distribution.map((item) => (
          <div key={item.provider} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground capitalize">{item.provider}</span>
              <span className="text-muted-foreground">
                {item.count.toLocaleString()} ({item.percentage}%)
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DatasetPanel({
  datasetName,
  description,
  recordCount,
  samples,
}: {
  datasetName: string;
  description: string;
  recordCount: number | string;
  samples: unknown[];
}) {
  const [selectedSample, setSelectedSample] = useState(0);

  const formatRecordCount = (count: number | string) => {
    if (typeof count === "string") return count;
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{datasetName}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {formatRecordCount(recordCount)} records
        </Badge>
      </div>

      {samples.length > 0 ? (
        <>
          <div className="flex gap-2 flex-wrap">
            {samples.map((_, index) => (
              <Button
                key={index}
                variant={selectedSample === index ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSample(index)}
              >
                Sample {index + 1}
              </Button>
            ))}
          </div>
          <SampleViewer data={samples[selectedSample]} />
        </>
      ) : (
        <div className="text-sm text-muted-foreground italic py-8 text-center border border-dashed rounded-md">
          No samples available yet
        </div>
      )}
    </div>
  );
}

function DataPreviewDashboard({ sessionToken }: { sessionToken: string }) {
  const [activeTab, setActiveTab] = useState<DatasetTab>("decisions");

  const stats = useQuery(api.dataPreview.getDatasetStats, { sessionToken });
  const llmDistribution = useQuery(api.dataPreview.getLLMDistribution, { sessionToken });
  const decisionLogs = useQuery(api.dataPreview.getSampleDecisionLogs, { sessionToken, limit: 10 });
  const negotiations = useQuery(api.dataPreview.getSampleNegotiations, { sessionToken, limit: 10 });
  const trustEvents = useQuery(api.dataPreview.getSampleTrustEvents, { sessionToken, limit: 10 });
  const economicData = useQuery(api.dataPreview.getSampleEconomicData, { sessionToken, limit: 10 });
  const reasoningChains = useQuery(api.dataPreview.getSampleReasoningChains, { sessionToken, limit: 10 });

  if (!stats || !llmDistribution) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2Icon className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading data preview...</p>
        </div>
      </div>
    );
  }

  const getActiveDataset = () => {
    switch (activeTab) {
      case "decisions":
        return decisionLogs;
      case "negotiations":
        return negotiations;
      case "trust":
        return trustEvents;
      case "economic":
        return economicData;
      case "reasoning":
        return reasoningChains;
    }
  };

  const activeDataset = getActiveDataset();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="text-primary border-primary/30">
            Data Preview
          </Badge>
          <h1 className="text-3xl font-bold text-foreground">
            ClawCity AI Behavioral Data
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Unlock insights from AI agent decisions. Rich behavioral data
            including decision traces, multi-agent negotiations, trust dynamics,
            and strategic reasoning chains.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            value={stats.totalDecisions as number | string}
            label="Decisions"
            icon={DatabaseIcon}
          />
          <StatCard
            value={stats.totalMessages as number | string}
            label="Messages"
            icon={MessageSquareIcon}
          />
          <StatCard
            value={stats.totalEvents as number | string}
            label="Events"
            icon={ActivityIcon}
          />
          <StatCard
            value={stats.uniqueLLMs}
            label="LLM Types"
            icon={CpuIcon}
          />
        </div>

        {/* Dataset Tabs */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Available Datasets</h2>

          {/* Tab Navigation */}
          <div className="flex gap-2 flex-wrap mb-6">
            {DATASET_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? "default" : "outline"}
                  onClick={() => setActiveTab(tab.key)}
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Active Dataset Content */}
          <Card>
            <CardContent className="pt-6">
              {activeDataset ? (
                <DatasetPanel
                  datasetName={activeDataset.datasetName}
                  description={activeDataset.description}
                  recordCount={activeDataset.recordCount}
                  samples={activeDataset.samples}
                />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LLM Distribution */}
        <div>
          <h2 className="text-lg font-semibold mb-4">LLM Model Distribution</h2>
          <div className="max-w-xl">
            <LLMDistributionCard
              distribution={llmDistribution.byProvider}
              totalAgents={llmDistribution.totalAgents}
            />
          </div>
        </div>

        {/* CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Interested in Our Data?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Contact for enterprise licensing, custom data packages, or
                research collaborations.
              </p>
              <a
                href="https://x.com/rasmic"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Contact: @rasmic (x.com/rasmic)
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DataPreviewPage() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const storedToken = localStorage.getItem(DATA_PREVIEW_TOKEN_KEY);
    setSessionToken(storedToken);
    setChecking(false);
  }, []);

  const sessionStatus = useQuery(
    api.dataPreview.validateDataPreviewSession,
    sessionToken ? { sessionToken } : "skip"
  );

  useEffect(() => {
    if (sessionStatus && !sessionStatus.valid) {
      localStorage.removeItem(DATA_PREVIEW_TOKEN_KEY);
      setSessionToken(null);
    }
  }, [sessionStatus]);

  if (checking || (sessionToken && sessionStatus === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!sessionToken || sessionStatus?.valid === false) {
    return <PasswordGate onAuthenticated={(token) => setSessionToken(token)} />;
  }

  return <DataPreviewDashboard sessionToken={sessionToken} />;
}
