import React from "react";
import PropTypes from "prop-types";

// Catches a render or effect error below it and draws `fallback` instead of
// letting React unmount the whole tree. Until v33.1.2 there was none anywhere,
// so one throw — three.js failing to get a WebGL context — blanked the site.
//
// `fallback` is a node, or `(error, reset) => node`. `resetKeys` clears the
// error when any of its values change, so moving to another route recovers
// without a reload.
const keysChanged = (a = [], b = []) => (
  a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]))
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    const { resetKeys } = this.props;
    const { error } = this.state;
    if (error && keysChanged(prevProps.resetKeys, resetKeys)) this.reset();
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info?.componentStack);
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    const { fallback, children } = this.props;
    if (!error) return children;
    return typeof fallback === "function" ? fallback(error, this.reset) : fallback;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  resetKeys: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool])),
};

ErrorBoundary.defaultProps = {
  children: null,
  fallback: null,
  resetKeys: [],
};

export default ErrorBoundary;
