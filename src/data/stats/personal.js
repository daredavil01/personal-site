import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';

const Age = () => {
  const [age, setAge] = useState();
  const [showDetailed, setShowDetailed] = useState(true);

  const tick = () => {
    const birthDate = "1999-01-22T09:24:00";
    if (showDetailed) {
      const now = dayjs();
      const birth = dayjs(birthDate);

      const years = now.diff(birth, 'year');
      const months = now.diff(birth.add(years, 'year'), 'month');
      const days = now.diff(birth.add(years, 'year').add(months, 'month'), 'day');
      const hours = now.diff(
        birth.add(years, 'year')
          .add(months, 'month')
          .add(days, 'day'),
        'hour',
      );
      const minutes = now.diff(
        birth.add(years, 'year')
          .add(months, 'month')
          .add(days, 'day')
          .add(hours, 'hour'),
        'minute',
      );
      const seconds = now.diff(
        birth.add(years, 'year')
          .add(months, 'month')
          .add(days, 'day')
          .add(hours, 'hour')
          .add(minutes, 'minute'),
        'second',
      );
      const milliseconds = now.diff(
        birth.add(years, 'year')
          .add(months, 'month')
          .add(days, 'day')
          .add(hours, 'hour')
          .add(minutes, 'minute')
          .add(seconds, 'second'),
        'millisecond',
      );

      setAge(`${years} years, ${months} months, ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds, ${milliseconds} milliseconds`);
    } else {
      const divisor = 1000 * 60 * 60 * 24 * 365.2421897; // ms in an average year
      const birthTime = new Date(birthDate);
      setAge(((Date.now() - birthTime) / divisor).toFixed(11));
    }
  };

  useEffect(() => {
    const timer = setInterval(() => tick(), 25);
    return () => {
      clearInterval(timer);
    };
  }, [showDetailed]);

  const toggleFormat = () => {
    setShowDetailed(!showDetailed);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div>{age}</div>
      <button
        onClick={toggleFormat}
        style={{ marginLeft: '10px', cursor: 'pointer' }}
        type="button"
      >
        Toggle Format
      </button>
    </div>
  );
};

const data = [
  {
    key: 'age',
    label: 'Current age',
    value: <Age />,
  },
  {
    key: 'location',
    label: 'Current city',
    value: 'Pune, MH',
  },
];

export default data;
