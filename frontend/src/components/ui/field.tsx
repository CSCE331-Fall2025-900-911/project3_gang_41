import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2", className)}
    {...props}
  />
))
Field.displayName = "Field"

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
FieldLabel.displayName = "FieldLabel"

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
FieldDescription.displayName = "FieldDescription"

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-4", className)}
    {...props}
  />
))
FieldGroup.displayName = "FieldGroup"

const FieldSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator> & {
    children?: React.ReactNode
  }
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <Separator ref={ref} className={className} {...props} />
    {children && (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="bg-background px-2 text-xs text-muted-foreground">
          {children}
        </span>
      </div>
    )}
  </div>
))
FieldSeparator.displayName = "FieldSeparator"

export { Field, FieldLabel, FieldDescription, FieldGroup, FieldSeparator }
