import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { createLogger } from "../../utils/logger";

const log = createLogger("ui");

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Changing this resets the boundary — pass the route so navigating recovers. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Stops a render error from blanking the whole app.
 *
 * React unmounts the entire tree when a render throws, so without a boundary
 * anywhere the user gets a white page and the only trace is the browser
 * console. This reports the failure and ships it to the log sink, so a crash in
 * one page leaves the navbar usable and a record behind.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    // Recover on navigation rather than stranding the user on the error card
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log.error(
      "Render error:",
      error.message,
      info.componentStack ?? "",
      error.stack ?? "",
    );
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Alert
        tone="error"
        title="Something went wrong on this page"
        className="mx-auto mt-16 max-w-lg"
        actions={
          <Button size="sm" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        }
      >
        <p>{error.message || "An unexpected error occurred."}</p>
        <p className="mt-2 text-xs opacity-75">
          The details have been written to the application log.
        </p>
      </Alert>
    );
  }
}
