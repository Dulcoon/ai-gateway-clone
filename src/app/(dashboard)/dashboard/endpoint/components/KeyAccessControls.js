"use client";

// Per-API-key access control on the Endpoint page.
// "Restrict access" toggle per key; when on, the key may call only the listed
// combos/models, shown as removable badges. Entries are picked with the same
// shared ModelSelectModal the combo editor uses (combos first, then models).
import { useState } from "react";
import PropTypes from "prop-types";
import { Toggle, ModelSelectModal } from "@/shared/components";

export default function KeyAccessControls({ apiKey, onChange, onRequestRestrict, onAllowedIpsChange }) {
  const access = apiKey.access || { restricted: false, allow: [] };
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeProviders, setActiveProviders] = useState([]);
  const [modelAliases, setModelAliases] = useState({});
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [ipInput, setIpInput] = useState(apiKey.allowedIps || "");

  const handleSaveIp = () => {
    if (onAllowedIpsChange) {
      onAllowedIpsChange(ipInput.trim());
    }
    setIsEditingIp(false);
  };

  const openPicker = async () => {
    setPickerOpen(true);
    // Same sources the combo editor feeds the picker with.
    try {
      const [providersRes, aliasRes] = await Promise.all([fetch("/api/providers"), fetch("/api/models/alias")]);
      if (providersRes.ok) setActiveProviders((await providersRes.json()).connections || []);
      if (aliasRes.ok) setModelAliases((await aliasRes.json()).aliases || {});
    } catch (error) {
      console.log("Error loading picker data:", error);
    }
  };

  const setAllow = (allow) => onChange({ restricted: true, allow });
  const add = (model) => {
    const value = model?.value;
    if (value && !access.allow.some((e) => e.toLowerCase() === value.toLowerCase())) setAllow([...access.allow, value]);
  };
  const remove = (value) => setAllow(access.allow.filter((e) => e !== value));

  return (
    <div className="mt-2" data-testid="key-access">
      <Toggle
        size="sm"
        checked={access.restricted}
        label="Restrict access"
        onChange={(checked) => (checked ? onRequestRestrict() : onChange({ restricted: false, allow: access.allow }))}
      />
      {access.restricted && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {access.allow.length === 0 && (
            <span className="text-xs text-orange-500">No combos or models allowed — this key can call nothing.</span>
          )}
          {access.allow.map((entry) => (
            <span key={entry} className="flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs text-text-main">
              {entry}
              <button
                onClick={() => remove(entry)}
                className="rounded text-text-muted hover:text-red-500"
                title={`Remove ${entry}`}
                aria-label={`Remove ${entry}`}
              >
                <span className="material-symbols-outlined leading-none" style={{ fontSize: "12px" }}>close</span>
              </button>
            </span>
          ))}
          <button
            onClick={openPicker}
            className="flex items-center gap-0.5 rounded-xl border border-dashed border-black/10 px-2 py-0.5 text-xs font-medium text-primary hover:border-primary/50 dark:border-white/10"
          >
            <span className="material-symbols-outlined leading-none" style={{ fontSize: "14px" }}>add</span>
            Add combo or model
          </button>
        </div>
      )}
      {pickerOpen && (
        <ModelSelectModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={add}
          onDeselect={(model) => remove(access.allow.find((e) => e.toLowerCase() === String(model?.value).toLowerCase()))}
          activeProviders={activeProviders}
          modelAliases={modelAliases}
          title={`Allowed for "${apiKey.name}"`}
          addedModelValues={access.allow}
          closeOnSelect={false}
        />
      )}

      {/* IP Whitelist */}
      <div className="mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="material-symbols-outlined text-[15px] text-text-muted">lan</span>
          <span className="text-xs font-medium text-text-muted">Allowed IPs:</span>
          {isEditingIp ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="127.0.0.1, 10.0.0.0/24 (empty for all)"
                className="w-full text-xs font-mono px-2 py-0.5 rounded border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 focus:outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveIp();
                  if (e.key === "Escape") {
                    setIpInput(apiKey.allowedIps || "");
                    setIsEditingIp(false);
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleSaveIp}
                className="px-2 py-0.5 text-xs font-medium rounded bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIpInput(apiKey.allowedIps || "");
                  setIsEditingIp(false);
                }}
                className="px-1.5 py-0.5 text-xs text-text-muted hover:text-text-main"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {apiKey.allowedIps && apiKey.allowedIps.trim() && apiKey.allowedIps.trim() !== "*" ? (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {apiKey.allowedIps}
                </span>
              ) : (
                <span className="text-[11px] text-text-muted italic">
                  Any IP allowed
                </span>
              )}
              <button
                onClick={() => {
                  setIpInput(apiKey.allowedIps || "");
                  setIsEditingIp(true);
                }}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                title="Edit allowed IPs"
              >
                <span className="material-symbols-outlined text-[13px]">edit</span>
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

KeyAccessControls.propTypes = {
  apiKey: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    allowedIps: PropTypes.string,
    access: PropTypes.shape({ restricted: PropTypes.bool, allow: PropTypes.arrayOf(PropTypes.string) }),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onRequestRestrict: PropTypes.func.isRequired,
  onAllowedIpsChange: PropTypes.func,
};
