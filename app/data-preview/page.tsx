"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
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
  ChevronDownIcon,
  ChevronUpIcon,
  MailIcon,
} from "lucide-react";

const CORRECT_PASSWORD = "Shimeles123Michael456Rasmic";

function PasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      localStorage.setItem("data-preview-auth", "true");
      onAuthenticated();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
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
            <Button type="submit" className="w-full">
              Access Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SampleViewer({ data, maxHeight = "200px" }: { data: unknown; maxHeight?: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-md overflow-hidden border border-border bg-muted/30">
      <div className="flex items-center justify-end gap-2 px-2 py-1 border-b border-border bg-muted/50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>
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
      <div
        className="overflow-auto transition-all duration-300"
        style={{ maxHeight: expanded ? "500px" : maxHeight }}
      >
        <pre className="p-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
}

function DatasetCard({
  name,
  description,
  recordCount,
  samples,
  icon: Icon,
  price,
}: {
  name: string;
  description: string;
  recordCount: number;
  samples: unknown[];
  icon: React.ElementType;
  price?: number;
}) {
  const [selectedSample, setSelectedSample] = useState(0);

  const formatRecordCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">{name}</CardTitle>
              <CardDescription className="text-xs">
                {formatRecordCount(recordCount)} records
              </CardDescription>
            </div>
          </div>
          {price && (
            <Badge variant="outline" className="text-green-500 border-green-500/30">
              ${price.toLocaleString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{description}</p>

        {samples.length > 0 && (
          <>
            <div className="flex gap-1">
              {samples.slice(0, 5).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedSample(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    selectedSample === index
                      ? "bg-primary"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
            <SampleViewer data={samples[selectedSample]} maxHeight="150px" />
          </>
        )}

        {samples.length === 0 && (
          <div className="text-xs text-muted-foreground italic py-4 text-center">
            No samples available yet
          </div>
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="pt-4">
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

function DataPreviewDashboard() {
  const stats = useQuery(api.dataPreview.getDatasetStats);
  const llmDistribution = useQuery(api.dataPreview.getLLMDistribution);
  const decisionLogs = useQuery(api.dataPreview.getSampleDecisionLogs, { limit: 5 });
  const negotiations = useQuery(api.dataPreview.getSampleNegotiations, { limit: 5 });
  const trustEvents = useQuery(api.dataPreview.getSampleTrustEvents, { limit: 5 });
  const economicData = useQuery(api.dataPreview.getSampleEconomicData, { limit: 5 });
  const reasoningChains = useQuery(api.dataPreview.getSampleReasoningChains, { limit: 5 });

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

        {/* Dataset Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Available Datasets</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {decisionLogs && (
              <DatasetCard
                name={decisionLogs.datasetName}
                description={decisionLogs.description}
                recordCount={decisionLogs.recordCount}
                samples={decisionLogs.samples}
                icon={DatabaseIcon}
                price={5000}
              />
            )}
            {negotiations && (
              <DatasetCard
                name={negotiations.datasetName}
                description={negotiations.description}
                recordCount={negotiations.recordCount}
                samples={negotiations.samples}
                icon={MessageSquareIcon}
                price={6000}
              />
            )}
            {trustEvents && (
              <DatasetCard
                name={trustEvents.datasetName}
                description={trustEvents.description}
                recordCount={trustEvents.recordCount}
                samples={trustEvents.samples}
                icon={HeartHandshakeIcon}
                price={4000}
              />
            )}
            {economicData && (
              <DatasetCard
                name={economicData.datasetName}
                description={economicData.description}
                recordCount={economicData.recordCount}
                samples={economicData.samples}
                icon={TrendingUpIcon}
                price={7000}
              />
            )}
            {reasoningChains && (
              <DatasetCard
                name={reasoningChains.datasetName}
                description={reasoningChains.description}
                recordCount={reasoningChains.recordCount}
                samples={reasoningChains.samples}
                icon={BrainIcon}
                price={10000}
              />
            )}
          </div>
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
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Interested in Our Data?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Contact us for enterprise licensing, custom data packages, or
                research collaborations.
              </p>
              <a href="mailto:data@clawcity.xyz">
                <Button className="inline-flex items-center gap-2">
                  <MailIcon className="w-4 h-4" />
                  Contact for Enterprise Access
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DataPreviewPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const isAuth = localStorage.getItem("data-preview-auth") === "true";
    setAuthenticated(isAuth);
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <PasswordGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  return <DataPreviewDashboard />;
}
