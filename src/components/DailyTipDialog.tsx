import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { getDailyTip } from "../services/TipsService";
import { IFitnessTip } from "../interface/IFitnessTip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";

const DAILY_TIP_HOUR = 9;

function todaysTipKey() {
  const today = new Date();
  return `dailyTipShown_${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
}

export function DailyTipDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const dueToday = new Date().getHours() >= DAILY_TIP_HOUR;
  const alreadyShown = sessionStorage.getItem(todaysTipKey()) === "1";
  const shouldFetch = !!user && dueToday && !alreadyShown;

  const { data } = useQuery({
    queryKey: ["dailyTip", todaysTipKey()],
    queryFn: async () => (await getDailyTip()).data.data as IFitnessTip,
    enabled: shouldFetch,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data) {
      setOpen(true);
      sessionStorage.setItem(todaysTipKey(), "1");
    }
  }, [data]);

  const handleClose = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{data?.Title ?? "Fitness Tip of the Day"}</DialogTitle>
          <DialogDescription>{data?.Description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
