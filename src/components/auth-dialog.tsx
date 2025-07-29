"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

type AuthDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (success: boolean) => void;
};

export function AuthDialog({ isOpen, onClose, onAuthenticate }: AuthDialogProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple password check
    if (password === "Trie123") {
      onAuthenticate(true);
      toast({
        title: "Authentication Successful",
        description: "You now have access to all features.",
      });
      setPassword("");
    } else {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Incorrect password. Please try again.",
      });
    }
    
    setIsLoading(false);
  };

  const handleClose = () => {
    setPassword("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Authentication Required
          </DialogTitle>
          <DialogDescription>
            Please enter the password to access protected features.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Authenticate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}