import { Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

const sizeClasses = {
  sm: "size-3",
  md: "size-5",
  lg: "size-8",
} as const;

interface SpinnerProps extends Omit<React.ComponentProps<"svg">, "size"> {
  size?: keyof typeof sizeClasses;
}

function Spinner({ className, size = "sm", ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("animate-spin", sizeClasses[size], className)}
      {...props}
    />
  )
}

export { Spinner }
