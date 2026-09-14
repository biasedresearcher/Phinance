"use client";

import { useEffect, useRef, useState } from "react";
import {
  FinanceData,
  PHINANCE_STORAGE_KEY,
  loadFinanceData,
  saveFinanceData,
} from "@/lib/finance-repository";

export const useFinanceData = () => {
  const [data, setData] = useState<FinanceData>(() => loadFinanceData());
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }

    saveFinanceData(data);
  }, [data]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PHINANCE_STORAGE_KEY) {
        return;
      }

      setData(loadFinanceData());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { data, setData };
};
