"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { PlusIcon, CopyIcon, CheckIcon, KeyIcon } from "lucide-react";

interface RegisterAgentDialogProps {
  trigger?: React.ReactElement;
}

export function RegisterAgentDialog({ trigger }: RegisterAgentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    agentId: string;
    apiKey: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const registerAgent = useMutation(api.agents.registerAgent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await registerAgent({ name: name.trim() });
      setResult({
        agentId: response.agentId,
        apiKey: response.apiKey,
      });
    } catch (error) {
      console.error("Failed to register agent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.apiKey) return;
    await navigator.clipboard.writeText(result.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after close animation
    setTimeout(() => {
      setName("");
      setResult(null);
      setCopied(false);
    }, 200);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          trigger || (
            <Button>
              <PlusIcon className="size-4 mr-2" />
              Register Agent
            </Button>
          )
        }
      />
      <AlertDialogContent>
        {!result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Register New Agent</AlertDialogTitle>
              <AlertDialogDescription>
                Create a new agent to participate in ClawCity. You will receive
                an API key that can only be viewed once.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form onSubmit={handleSubmit}>
              <Field className="mt-2">
                <FieldLabel htmlFor="agent-name">Agent Name</FieldLabel>
                <Input
                  id="agent-name"
                  placeholder="Enter agent name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel onClick={handleClose}>
                  Cancel
                </AlertDialogCancel>
                <Button type="submit" disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? "Registering..." : "Register"}
                </Button>
              </AlertDialogFooter>
            </form>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Agent Registered Successfully</AlertDialogTitle>
              <AlertDialogDescription>
                Your agent has been created. Copy the API key below - it will
                only be shown once!
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-4 space-y-4">
              <Field>
                <FieldLabel>Agent ID</FieldLabel>
                <div className="bg-muted rounded-md px-3 py-2 font-mono text-xs">
                  {result.agentId}
                </div>
              </Field>
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <KeyIcon className="size-3.5 text-amber-500" />
                  API Key (save this now!)
                </FieldLabel>
                <div className="flex gap-2">
                  <div className="bg-amber-500/10 border-amber-500/20 flex-1 rounded-md border px-3 py-2 font-mono text-xs break-all">
                    {result.apiKey}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckIcon className="size-3.5 text-green-500" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                  </Button>
                </div>
                <FieldDescription className="text-amber-600 dark:text-amber-400">
                  This key will never be shown again. Make sure to save it
                  securely.
                </FieldDescription>
              </Field>
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogAction onClick={handleClose}>Done</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
