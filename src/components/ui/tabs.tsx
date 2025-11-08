import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
  registerTrigger: (value: string, ref: HTMLButtonElement | null) => void
  triggers: Map<string, HTMLButtonElement>
  underlineStyle: { left: number; width: number }
  layoutId: string
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

const Tabs = ({ value, onValueChange, children, className }: TabsProps) => {
  const triggersRef = React.useRef<Map<string, HTMLButtonElement>>(new Map())
  const [underlineStyle, setUnderlineStyle] = React.useState({ left: 0, width: 0 })
  const layoutIdRef = React.useRef(`underline-${Math.random().toString(36).slice(2, 11)}`)

  const registerTrigger = React.useCallback((triggerValue: string, ref: HTMLButtonElement | null) => {
    if (ref) {
      triggersRef.current.set(triggerValue, ref)
      // If this is the active tab, update underline position
      if (triggerValue === value) {
        requestAnimationFrame(() => {
          const { offsetLeft, offsetWidth } = ref
          setUnderlineStyle({
            left: offsetLeft,
            width: offsetWidth
          })
        })
      }
    } else {
      triggersRef.current.delete(triggerValue)
    }
  }, [value])

  const updateUnderline = React.useCallback(() => {
    const activeTabElement = triggersRef.current.get(value)
    if (activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement
      setUnderlineStyle({
        left: offsetLeft,
        width: offsetWidth
      })
    }
  }, [value])

  React.useLayoutEffect(() => {
    updateUnderline()
  }, [updateUnderline])

  // Also update on window resize
  React.useEffect(() => {
    const handleResize = () => {
      updateUnderline()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateUnderline])

  const contextValue = React.useMemo(
    () => ({
      value,
      onValueChange,
      registerTrigger,
      triggers: triggersRef.current,
      underlineStyle,
      layoutId: layoutIdRef.current
    }),
    [value, onValueChange, registerTrigger, underlineStyle]
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center relative rounded-none border-b p-0 bg-background",
        className
      )}
      {...props}
    >
      {props.children}
      {context && context.underlineStyle && (
        <motion.div
          className="bg-primary absolute bottom-0 z-20 h-0.5"
          layoutId={context.layoutId}
          style={{
            left: context.underlineStyle.left,
            width: context.underlineStyle.width
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 40
          }}
        />
      )}
    </div>
  )
})
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    if (!context) {
      throw new Error("TabsTrigger must be used within Tabs")
    }
    const isActive = context.value === value
    const internalRef = React.useRef<HTMLButtonElement>(null)

    React.useEffect(() => {
      const element = internalRef.current
      if (element) {
        context.registerTrigger(value, element)
      }
      return () => {
        context.registerTrigger(value, null)
      }
    }, [value, context])

    const combinedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        internalRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    return (
      <button
        ref={combinedRef}
        type="button"
        className={cn(
          "bg-background dark:data-[state=active]:bg-background relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-none border-0 px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-none",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
        data-state={isActive ? "active" : "inactive"}
        onClick={() => context.onValueChange(value)}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("TabsContent must be used within Tabs")
  }

  if (context.value !== value) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }

