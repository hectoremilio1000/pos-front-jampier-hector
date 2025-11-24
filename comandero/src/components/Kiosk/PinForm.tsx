// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/components/Kiosk/PinForm.tsx

import { type FC } from "react";
import { Button, Input } from "antd";

type Props = {
  pin: string;
  loading: boolean;
  disabled?: boolean;
  onPinChange: (v: string) => void;
  onEnter: () => void;
  onClear: () => void;
  onFocusPin?: () => void; // para activar keypad en "pin"
};

const PinForm: FC<Props> = ({
  pin,
  loading,
  disabled,
  onPinChange,
  onEnter,
  onClear,
  onFocusPin,
}) => {
  return (
    <>
      <div className="text-sm font-semibold">PIN de operador</div>
      <Input.Password
        maxLength={6}
        value={pin}
        onFocus={onFocusPin}
        onChange={(e) =>
          onPinChange(e.target.value.replace(/\D/g, "").slice(0, 6))
        }
        placeholder="••••••"
        style={{ textAlign: "center", letterSpacing: 4, fontSize: 22 }}
        onPressEnter={onEnter}
      />
      <div className="flex gap-2 mt-2">
        <Button block onClick={onClear}>
          Borrar
        </Button>
        <Button
          type="primary"
          block
          loading={loading}
          onClick={onEnter}
          disabled={disabled}
        >
          Entrar
        </Button>
      </div>
    </>
  );
};

export default PinForm;
