import React, { useState } from "react";
import PropTypes from "prop-types";
import ImageSlider from "../Instagram/ImageSlider";

const SportV2 = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const dateObj = new Date(data.date);
  const month = dateObj.toLocaleString('default', { month: 'short' });
  const day = dateObj.getDate().toString().padStart(2, '0');
  const year = dateObj.getFullYear();

  return (
    <div 
      className={`group flex flex-col p-8 bg-secondary/[0.03] rounded-xl border border-secondary/10 transition-all duration-300 gap-6 cursor-pointer ${isExpanded ? 'bg-secondary/[0.06]' : 'hover:bg-secondary/[0.06]'}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full">
        <div className="flex items-center gap-8">
          <div className="font-label text-center min-w-[3rem]">
            <span className="text-xs text-stone-400 uppercase block">{month}</span>
            <span className={`text-2xl font-black transition-colors ${isExpanded ? 'text-secondary' : 'text-stone-400 group-hover:text-stone-800'}`}>{day}</span>
            <span className="text-[10px] text-stone-300 uppercase block mt-1">{year}</span>
          </div>
          <div>
            <h5 className={`font-body font-bold text-xl transition-colors ${isExpanded ? 'text-stone-900' : 'text-stone-700 group-hover:text-stone-900'}`}>{data.title}</h5>
            <p className="font-label text-xs text-stone-400 uppercase tracking-widest mt-1">{data.distance} • {data.place}</p>
          </div>
        </div>
        <div className="text-left md:text-right flex md:block items-center justify-between w-full md:w-auto">
          <div className="font-label text-2xl font-black text-stone-800">{data.time}</div>
          <span className="font-label text-[10px] text-stone-400 uppercase tracking-[0.2em] block mt-1 flex items-center justify-end gap-1">
            {isExpanded ? 'Hide Details' : 'View Details'}
            <span className={`material-symbols-outlined text-[10px] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-secondary' : ''}`}>expand_more</span>
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100 mt-2 pt-6 border-t border-stone-200' : 'max-h-0 opacity-0 m-0 p-0 border-t-0 border-transparent hidden'}`}>
        <div onClick={(e) => e.stopPropagation()} className="cursor-default">
          <p className="font-body text-stone-600 text-lg leading-relaxed mb-8 italic">"{data.description}"</p>
          
          {data.slideImages && data.slideImages.length > 0 && (
            <div className="mb-8 w-full">
              <span className="font-label text-[10px] text-stone-400 uppercase tracking-widest mb-4 block">Event Documentation</span>
              <div className="rounded-xl overflow-hidden border border-stone-200">
                <ImageSlider data={data.slideImages} />
              </div>
            </div>
          )}

          {data.timeCertificateLink && (
            <div className="flex gap-4">
              <a href={data.timeCertificateLink} target="_blank" rel="noopener noreferrer" className="bg-stone-100 border border-stone-200 text-stone-800 px-6 py-3 rounded-lg font-label font-bold text-xs uppercase tracking-widest hover:bg-stone-200 active:scale-95 transition-all">
                Official Certificate
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

SportV2.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    date: PropTypes.string,
    description: PropTypes.string,
    place: PropTypes.string,
    distance: PropTypes.string,
    time: PropTypes.string,
    timeCertificateLink: PropTypes.string,
    slideImages: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        caption: PropTypes.string,
      })
    ),
  }).isRequired,
};

export default SportV2;
