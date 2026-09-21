import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { entityLabel } from "../../data/askConfig";
import { colorForTag } from "../../lib/generativeArt";
import { useTagColors } from "../../context/ContentContext";

// "More like this", powered by the /ask embeddings — the index pays for itself
// twice. Nearest neighbours of this item's own stored vector, so no model call
// and no API key is involved at read time.
//
// Renders nothing when there is nothing to show: on a page that has just been
// added, or before `npm run ask:index` has run, an empty strip is better than a
// heading over a blank row.

const RelatedContent = ({
  type, id, limit, title, types, excludeTypes,
}) => {
  const [items, setItems] = useState([]);
  const colors = useTagColors();

  useEffect(() => {
    if (!isSupabaseConfigured || !type || !id) return;
    let cancelled = false;
    supabase
      .rpc("related_content_ranked", {
        p_type: type, p_id: Number(id), p_limit: limit, p_types: types || null,
      })
      .then(({ data, error }) => {
        if (cancelled || error) return;
        // Filtered here rather than in the RPC: the caller knows what another
        // strip on the same page is already showing, and naming every type it
        // does NOT want would be a list to keep in step with the schema.
        setItems((data || []).filter((r) => !excludeTypes?.includes(r.entity_type)));
      });
    // eslint-disable-next-line consistent-return
    return () => {
      cancelled = true;
    };
  }, [type, id, limit, types, excludeTypes]);

  if (!items.length) return null;

  return (
    <section className="mt-10">
      <h2 className="font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((item) => {
          const accent = colorForTag(
            item.tags?.[0] || item.entity_type,
            item.tags?.[0] ? colors.get(item.tags[0]) : null,
          );
          return (
            <Link
              key={`${item.entity_type}-${item.entity_id}`}
              to={item.url || "/"}
              className="group flex items-start gap-3 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
            >
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium truncate group-hover:underline">
                  {item.title || "Untitled"}
                </span>
                <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                  {entityLabel(item.entity_type)}
                  {item.chunk_date ? ` · ${item.chunk_date}` : ""}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

RelatedContent.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  limit: PropTypes.number,
  title: PropTypes.string,
  // Narrows the neighbours to these entity types, which the RPC has always
  // supported and nothing passed. Null means the whole archive.
  types: PropTypes.arrayOf(PropTypes.string),
  // Drops these types from the answer, for a page that shows them separately.
  excludeTypes: PropTypes.arrayOf(PropTypes.string),
};

RelatedContent.defaultProps = {
  limit: 6, title: "Related from the archive", types: null, excludeTypes: null,
};

export default RelatedContent;
