import React from "react";
import { Navigate, useParams } from "react-router-dom";
import ResourceManager from "./ResourceManager";
import { byKey } from "./resources";

// `/admin/:resourceKey` for the schema-driven content tables. The key is
// remounted through `key={}` so switching tables resets list state (search,
// selection, any open form) instead of carrying it across resources.
const ResourceRoute = () => {
  const { resourceKey } = useParams();
  const resource = byKey(resourceKey);
  if (!resource) return <Navigate to="/admin" replace />;
  return <ResourceManager key={resource.key} resource={resource} />;
};

export default ResourceRoute;
