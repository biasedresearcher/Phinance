"use client";

import { useEffect, useState } from "react";
import {
  FinanceData,
  getEmptyFinanceData,
  listFinanceData,
} from "@/lib/finance-repository";

export const useFinanceData = () => {
  const [data, setData] = useState<FinanceData>(getEmptyFinanceData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const financeData = await listFinanceData();

        if (!cancelled) {
          setData(financeData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load finance data");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    data,
    setData,
    isLoading,
    error,
  };
};
