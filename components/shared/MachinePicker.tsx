"use client";
import { useTranslations } from "next-intl";
import { SearchPicker } from "@/components/shared/SearchPicker";

interface PickableMachine {
  id: string;
  machineCode: string;
  machineName: string;
}

interface MachinePickerProps {
  machines: PickableMachine[];
  value: string;
  onChange: (id: string) => void;
}

export function MachinePicker({ machines, value, onChange }: MachinePickerProps) {
  const t = useTranslations("WorkOrders");
  return (
    <SearchPicker
      items={machines.map((m) => ({ id: m.id, code: m.machineCode, label: m.machineName }))}
      value={value}
      onChange={onChange}
      placeholder={t("searchOrScanMachine")}
      noResultsText={t("noMachinesFound")}
      changeLabel={t("changeMachine")}
    />
  );
}
