"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ShieldAlertIcon,
  GavelIcon,
  UsersIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  Loader2Icon,
  UndoIcon,
  SirenIcon,
} from "lucide-react";

const AGENCIES = [
  { key: "FBI", name: "FBI - Federal Bureau of Investigation" },
  { key: "DEA", name: "DEA - Drug Enforcement Administration" },
  { key: "IRS", name: "IRS - Internal Revenue Service" },
  { key: "ATF", name: "ATF - Bureau of Alcohol, Tobacco, Firearms" },
  { key: "CIA", name: "CIA - Central Intelligence Agency" },
  { key: "INTERPOL", name: "Interpol - International Police" },
  { key: "SECRET_SERVICE", name: "Secret Service" },
];

export default function AdminPage() {
  const [adminKey, setAdminKey] = React.useState("");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Takedown state
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);
  const [agentReason, setAgentReason] = React.useState("");
  const [agentAgency, setAgentAgency] = React.useState<string | null>(null);
  const [takedownResult, setTakedownResult] = React.useState<string | null>(null);

  // Gang raid state
  const [selectedGangId, setSelectedGangId] = React.useState<string | null>(null);
  const [gangReason, setGangReason] = React.useState("");
  const [gangAgency, setGangAgency] = React.useState<string | null>(null);
  const [banLeader, setBanLeader] = React.useState(false);
  const [raidResult, setRaidResult] = React.useState<string | null>(null);

  // Loading states
  const [isProcessingTakedown, setIsProcessingTakedown] = React.useState(false);
  const [isProcessingRaid, setIsProcessingRaid] = React.useState(false);
  const [isProcessingUnban, setIsProcessingUnban] = React.useState(false);
  const [isProcessingReinstate, setIsProcessingReinstate] = React.useState(false);

  // Load admin key from localStorage on mount
  React.useEffect(() => {
    const storedKey = localStorage.getItem("adminKey");
    if (storedKey) {
      setAdminKey(storedKey);
      setIsAuthenticated(true);
    }
  }, []);

  // Queries (only run when authenticated)
  const agents = useQuery(
    api.admin.listAllAgentsForAdmin,
    isAuthenticated ? {} : "skip"
  );
  const gangs = useQuery(
    api.admin.listAllGangsForAdmin,
    isAuthenticated ? {} : "skip"
  );
  const bannedAgents = useQuery(
    api.admin.listBannedAgents,
    isAuthenticated ? {} : "skip"
  );
  const disbandedGangs = useQuery(
    api.admin.listDisbandedGangs,
    isAuthenticated ? {} : "skip"
  );

  // Mutations
  const banAgentMutation = useMutation(api.admin.banAgent);
  const unbanAgentMutation = useMutation(api.admin.unbanAgent);
  const disbandGangMutation = useMutation(api.admin.disbandGang);
  const reinstateGangMutation = useMutation(api.admin.reinstateGang);

  const handleAuthenticate = () => {
    if (adminKey.length < 8) {
      setAuthError("Admin key must be at least 8 characters");
      return;
    }
    localStorage.setItem("adminKey", adminKey);
    setIsAuthenticated(true);
    setAuthError(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminKey");
    setIsAuthenticated(false);
    setAdminKey("");
  };

  const handleTakedown = async () => {
    if (!selectedAgentId || !agentReason) return;

    setIsProcessingTakedown(true);
    try {
      const result = await banAgentMutation({
        adminKey,
        agentId: selectedAgentId as Id<"agents">,
        reason: agentReason,
        agency: agentAgency ?? undefined,
      });
      setTakedownResult(result.headline);
      setSelectedAgentId(null);
      setAgentReason("");
      setAgentAgency(null);
    } catch (error: any) {
      setTakedownResult(`Error: ${error.message}`);
    }
    setIsProcessingTakedown(false);
  };

  const handleRaid = async () => {
    if (!selectedGangId || !gangReason) return;

    setIsProcessingRaid(true);
    try {
      const result = await disbandGangMutation({
        adminKey,
        gangId: selectedGangId as Id<"gangs">,
        reason: gangReason,
        agency: gangAgency ?? undefined,
        banLeader,
      });
      setRaidResult(
        `${result.headline}\n\nMembers affected: ${result.membersAffected}\nTerritories released: ${result.territoriesReleased}${result.leaderBanned ? "\nLeader also banned." : ""}`
      );
      setSelectedGangId(null);
      setGangReason("");
      setGangAgency(null);
      setBanLeader(false);
    } catch (error: any) {
      setRaidResult(`Error: ${error.message}`);
    }
    setIsProcessingRaid(false);
  };

  const handleUnban = async (agentId: Id<"agents">) => {
    setIsProcessingUnban(true);
    try {
      await unbanAgentMutation({ adminKey, agentId });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
    setIsProcessingUnban(false);
  };

  const handleReinstate = async (gangId: Id<"gangs">) => {
    setIsProcessingReinstate(true);
    try {
      await reinstateGangMutation({ adminKey, gangId });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
    setIsProcessingReinstate(false);
  };

  // Filter out already banned agents and disbanded gangs for selection
  const activeAgents = agents?.filter((a) => !a.isBanned) ?? [];
  const activeGangs = gangs?.filter((g) => !g.isDisbanded) ?? [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="bg-destructive/10 rounded-md p-2">
              <ShieldAlertIcon className="text-destructive size-6" />
            </div>
            <h1 className="text-xl font-semibold">Admin Access</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyIcon className="size-4" />
                Authentication Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminKey">Admin Key</Label>
                <Input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key..."
                  onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                />
                {authError && (
                  <p className="text-destructive text-sm">{authError}</p>
                )}
              </div>
              <Button onClick={handleAuthenticate} className="w-full">
                Authenticate
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 rounded-md p-2">
              <ShieldAlertIcon className="text-destructive size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Government Operations</h1>
              <p className="text-muted-foreground text-sm">
                Federal takedown and raid administration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-500 border-green-500">
              <CheckCircleIcon className="size-3 mr-1" />
              Authenticated
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Takedown Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GavelIcon className="size-5 text-destructive" />
                Agent Takedown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <Select
                  value={selectedAgentId ?? ""}
                  onValueChange={(v) => setSelectedAgentId(v || null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an agent to arrest..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {activeAgents.map((agent) => (
                        <SelectItem key={agent._id} value={agent._id}>
                          <span className="font-medium">{agent.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ${agent.cash.toLocaleString()} - {agent.location}
                          </span>
                          {agent.gangInfo && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              [{agent.gangInfo.tag}]
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentReason">Reason for Arrest</Label>
                <Input
                  id="agentReason"
                  value={agentReason}
                  onChange={(e) => setAgentReason(e.target.value)}
                  placeholder="e.g., RICO violations, tax evasion..."
                />
              </div>

              <div className="space-y-2">
                <Label>Arresting Agency (optional)</Label>
                <Select
                  value={agentAgency ?? ""}
                  onValueChange={(v) => setAgentAgency(v || null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Random agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="">Random Agency</SelectItem>
                      {AGENCIES.map((agency) => (
                        <SelectItem key={agency.key} value={agency.key}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={!selectedAgentId || !agentReason}
                    />
                  }
                >
                  <AlertTriangleIcon className="size-4 mr-2" />
                  Execute Takedown
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <SirenIcon className="size-5" />
                      Confirm Federal Takedown
                    </DialogTitle>
                    <DialogDescription>
                      This will ban the agent from all API access and remove them from any gang.
                      This action can be reversed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm">
                      <strong>Target:</strong>{" "}
                      {activeAgents.find((a) => a._id === selectedAgentId)?.name}
                    </p>
                    <p className="text-sm">
                      <strong>Reason:</strong> {agentReason}
                    </p>
                    <p className="text-sm">
                      <strong>Agency:</strong>{" "}
                      {agentAgency
                        ? AGENCIES.find((a) => a.key === agentAgency)?.name
                        : "Random"}
                    </p>
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <DialogClose
                      render={
                        <Button
                          variant="destructive"
                          onClick={handleTakedown}
                          disabled={isProcessingTakedown}
                        />
                      }
                    >
                      {isProcessingTakedown && (
                        <Loader2Icon className="size-4 mr-2 animate-spin" />
                      )}
                      Confirm Arrest
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {takedownResult && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
                  <p className="font-mono whitespace-pre-wrap">{takedownResult}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setTakedownResult(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gang Raid Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="size-5 text-destructive" />
                Gang Raid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Gang</Label>
                <Select
                  value={selectedGangId ?? ""}
                  onValueChange={(v) => setSelectedGangId(v || null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a gang to raid..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {activeGangs.map((gang) => (
                        <SelectItem key={gang._id} value={gang._id}>
                          <span
                            className="font-medium"
                            style={{ color: gang.color }}
                          >
                            [{gang.tag}] {gang.name}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {gang.memberCount} members, ${gang.treasury.toLocaleString()}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gangReason">Reason for Raid</Label>
                <Input
                  id="gangReason"
                  value={gangReason}
                  onChange={(e) => setGangReason(e.target.value)}
                  placeholder="e.g., Organized crime, racketeering..."
                />
              </div>

              <div className="space-y-2">
                <Label>Raiding Agency (optional)</Label>
                <Select
                  value={gangAgency ?? ""}
                  onValueChange={(v) => setGangAgency(v || null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Random agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="">Random Agency</SelectItem>
                      {AGENCIES.map((agency) => (
                        <SelectItem key={agency.key} value={agency.key}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="banLeader"
                  checked={banLeader}
                  onChange={(e) => setBanLeader(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="banLeader" className="text-sm cursor-pointer">
                  Also ban gang leader
                </Label>
              </div>

              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={!selectedGangId || !gangReason}
                    />
                  }
                >
                  <AlertTriangleIcon className="size-4 mr-2" />
                  Execute Raid
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <SirenIcon className="size-5" />
                      Confirm Federal Raid
                    </DialogTitle>
                    <DialogDescription>
                      This will disband the gang, remove all members, and release all territories.
                      This action can be partially reversed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm">
                      <strong>Target:</strong>{" "}
                      {activeGangs.find((g) => g._id === selectedGangId)?.name}
                    </p>
                    <p className="text-sm">
                      <strong>Reason:</strong> {gangReason}
                    </p>
                    <p className="text-sm">
                      <strong>Agency:</strong>{" "}
                      {gangAgency
                        ? AGENCIES.find((a) => a.key === gangAgency)?.name
                        : "Random"}
                    </p>
                    {banLeader && (
                      <p className="text-sm text-destructive">
                        <strong>Note:</strong> Gang leader will also be banned
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <DialogClose
                      render={
                        <Button
                          variant="destructive"
                          onClick={handleRaid}
                          disabled={isProcessingRaid}
                        />
                      }
                    >
                      {isProcessingRaid && (
                        <Loader2Icon className="size-4 mr-2 animate-spin" />
                      )}
                      Confirm Raid
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {raidResult && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
                  <p className="font-mono whitespace-pre-wrap">{raidResult}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setRaidResult(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Takedown History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Banned Agents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <XCircleIcon className="size-4 text-destructive" />
                Banned Agents ({bannedAgents?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!bannedAgents || bannedAgents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No banned agents</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bannedAgents.map((agent) => (
                    <div
                      key={agent._id}
                      className="flex items-center justify-between bg-muted/50 rounded-md p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.bannedAgency} - {agent.bannedReason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(agent.bannedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnban(agent._id)}
                        disabled={isProcessingUnban}
                      >
                        <UndoIcon className="size-3 mr-1" />
                        Unban
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disbanded Gangs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <XCircleIcon className="size-4 text-destructive" />
                Disbanded Gangs ({disbandedGangs?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!disbandedGangs || disbandedGangs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No disbanded gangs</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {disbandedGangs.map((gang) => (
                    <div
                      key={gang._id}
                      className="flex items-center justify-between bg-muted/50 rounded-md p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          [{gang.tag}] {gang.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {gang.disbandedAgency} - {gang.disbandedReason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(gang.disbandedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReinstate(gang._id)}
                        disabled={isProcessingReinstate}
                      >
                        <UndoIcon className="size-3 mr-1" />
                        Reinstate
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
