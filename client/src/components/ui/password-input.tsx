import { forwardRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type">>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn(className, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setVisible(value => !value)}
          disabled={disabled}
          aria-label={visible ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          aria-pressed={visible}
          aria-controls={props.id}
          title={visible ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-gray-500 hover:text-gwc-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
