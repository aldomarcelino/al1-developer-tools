"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { dataTypes, type DataType } from "../lib/schema";

const options = dataTypes.map(([value, label, group]) => ({ value, label, group }));

export function DataTypePicker({
  value,
  onChange,
  fieldName,
}: {
  value: DataType;
  onChange: (value: DataType) => void;
  fieldName: string;
}) {
  const name = fieldName || "unnamed field";
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={`Data type for ${name}`}
      searchLabel={`Search data types for ${name}`}
      searchPlaceholder="Search data types…"
      emptyMessage="No matching types."
    />
  );
}
