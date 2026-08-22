"use client";

import { InputGroup, Input, InputAddon } from "@chakra-ui/react";
import { Search } from "lucide-react";

export function SearchInput({ value, onChange, placeholder = "Buscar" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <InputGroup startElement={<InputAddon bg="transparent" border="0"><Search size={16} /></InputAddon>}><Input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} css={{ bg: "surface.primary", borderColor: "surface.border", borderRadius: "xl", h: 10, fontSize: "sm", _focusVisible: { borderColor: "brand.500", boxShadow: "0 0 0 3px rgba(16,185,129,.14)" } }} /></InputGroup>;
}
