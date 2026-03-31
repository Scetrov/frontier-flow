import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AuthorizeTurretItem from "../components/AuthorizeTurretItem";
import type { TurretInfo } from "../types/authorization";

const replacementTurret: TurretInfo = {
  objectId: "0x222",
  displayName: "Shield Bastion",
  currentExtension: {
    packageId: "0xdecafbad",
    moduleName: "old_contract",
    typeName: "0xdecafbad::old_contract::TurretAuth",
    isCurrentDeployment: false,
  },
};

const unnamedTurret: TurretInfo = {
  objectId: "0x58091234567890abcdef1234567890abcdef1234567890abcdef123456789082",
  displayName: null,
  currentExtension: null,
};

describe("AuthorizeTurretItem", () => {
  it("renders an inline replacement warning when a different extension is selected", () => {
    render(
      <AuthorizeTurretItem
        checked
        onToggle={() => undefined}
        showReplacementWarning
        turret={replacementTurret}
      />, 
    );

    expect(screen.getByText("This will replace the current extension")).toBeVisible();
  });

  it("toggles the checkbox when the row is interactive", () => {
    const handleToggle = vi.fn();
    render(
      <AuthorizeTurretItem
        checked={false}
        onToggle={handleToggle}
        turret={replacementTurret}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Shield Bastion" }));

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("opens simulation without toggling the checkbox", () => {
    const handleToggle = vi.fn();
    const handleSimulate = vi.fn();

    render(
      <AuthorizeTurretItem
        checked={false}
        onSimulate={handleSimulate}
        onToggle={handleToggle}
        turret={replacementTurret}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Simulate turret Shield Bastion" }));

    expect(handleSimulate).toHaveBeenCalledWith(replacementTurret);
    expect(handleToggle).not.toHaveBeenCalled();
  });

  it("shows the full turret object id when no display name is available", () => {
    render(
      <AuthorizeTurretItem
        checked={false}
        onToggle={() => undefined}
        turret={unnamedTurret}
      />,
    );

    expect(screen.getAllByText(unnamedTurret.objectId)).toHaveLength(2);
  });
});