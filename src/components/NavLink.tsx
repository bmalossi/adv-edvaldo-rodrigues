import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, children, ...props }, ref) => {
    const isStaticOrExternal =
      typeof to === "string" && (to.endsWith(".html") || to.startsWith("http"));

    if (isStaticOrExternal) {
      return (
        <a
          ref={ref}
          href={to as string}
          className={cn(className)}
          {...(props as any)}
        >
          {typeof children === "function" ? children({ isActive: false, isPending: false } as any) : children}
        </a>
      );
    }

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      >
        {children}
      </RouterNavLink>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
