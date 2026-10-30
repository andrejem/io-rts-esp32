import { useCallback, useEffect, useState } from "preact/hooks";
import { useOtaKey } from "../../hooks/api/useOtaKey.tsx";
import useI18n from "../../hooks/useI18n";
import { useToast } from "../../hooks/useToast";
import { ToastType } from "../ToastProvider";
import { DeviceRow } from "./DeviceRow";
import { DeviceRowProps, postAction } from "./shared";

/** Input value for a stored favorite value: -1 (not set) becomes an empty field */
function toInput(v: number | undefined): string {
  return v !== undefined && v >= 0 ? String(Math.round(v)) : "";
}

/** Empty field = not set (-1), otherwise 0–100; null = invalid */
function fromInput(v: string): number | null {
  if (v.trim() === "") return -1;
  const n = parseInt(v, 10);
  return isNaN(n) || n < 0 || n > 100 ? null : n;
}

/**
 * Position and tilt of the device's own favorite ("my") position. Some devices (e.g. Somfy J406 io)
 * report a marker instead of their position or tilt while they are at their favorite position;
 * the gateway then reports these values instead of "unknown".
 */
export function MyStateRow({ device, setDeviceState }: DeviceRowProps) {
  const [posInput, setPosInput] = useState(toInput(device.my_position));
  const [tiltInput, setTiltInput] = useState(toInput(device.my_tilt));
  const showToast = useToast();
  const { t } = useI18n();
  const otaData = useOtaKey();

  useEffect(() => {
    setPosInput(toInput(device.my_position));
    setTiltInput(toInput(device.my_tilt));
  }, [device.my_position, device.my_tilt]);

  const handleSave = useCallback(async () => {
    const pos = fromInput(posInput);
    const tilt = fromInput(tiltInput);
    if (pos === null || tilt === null) {
      showToast(t("popup.my_state_invalid") || "Enter 0–100 or leave empty.", ToastType.ERROR);
      return;
    }
    try {
      const r = await postAction(device.id, "setFavoriteState", otaData.data?.key as string, {
        value: pos,
        tilt,
      });
      if (!r.success) {
        showToast(r.message || "Save failed.", ToastType.ERROR);
        return;
      }
      setDeviceState((prev) => ({ ...prev, my_position: pos, my_tilt: tilt }));
      showToast(t("popup.my_state_saved") || "My position saved.", ToastType.SUCCESS);
    } catch (e) {
      showToast((e as Error).message, ToastType.ERROR);
    }
  }, [device.id, otaData.data?.key, posInput, tiltInput, setDeviceState, showToast, t]);

  if (device.protocol === "1w") return null;

  return (
    <DeviceRow
      label={t("popup.my_state") || "My position (status)"}
      subLabel={t("popup.my_state_hint") || "Shown when the motor only reports 'at my'. Empty = unknown."}
    >
      <input
        type="number"
        min="0"
        max="100"
        value={posInput}
        onInput={(e) => setPosInput(e.currentTarget.value)}
        class="s-input"
        style="width: 64px;"
        placeholder={t("popup.my_state_height") || "Height"}
        title={t("popup.my_state_height") || "Height"}
      />
      {device.tilt_supported && (
        <input
          type="number"
          min="0"
          max="100"
          value={tiltInput}
          onInput={(e) => setTiltInput(e.currentTarget.value)}
          class="s-input"
          style="width: 64px;"
          placeholder={t("popup.my_state_tilt") || "Tilt"}
          title={t("popup.my_state_tilt") || "Tilt"}
        />
      )}
      <button
        type="button"
        class="s-btn primary"
        onClick={handleSave}
        disabled={!otaData.loaded || !otaData.data?.key}
      >
        {t("button.save") || "Save"}
      </button>
    </DeviceRow>
  );
}
