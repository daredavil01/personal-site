import React from "react";
import ShareImageButton from "../share/ShareImageButton";

// Micro-blog image export is now unified with the shared share-as-image module.
// This thin wrapper preserves the existing `post` prop API so the import sites
// (PostModal, MicroBlogPost) keep working unchanged while gaining the
// customization popup, Light/Dark/Abstract backgrounds, and native share.
const ExportImageButton = ({ post }) => <ShareImageButton kind="microblog" item={post} />;

export default ExportImageButton;
