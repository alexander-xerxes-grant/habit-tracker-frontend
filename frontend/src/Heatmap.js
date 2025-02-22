import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const Heatmap = ({ completedDates, onCompleteDay }) => {
  const heatmapRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    // Create a tooltip when component mounts
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'heatmap-tooltip')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('border', '1px solid #ccc')
      .style('padding', '4px 8px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000); // Ensure tooltip stays on top

    // Store the tooltip reference
    tooltipRef.current = tooltip;

    // Add a reusuable hide tooltip function
    const hideTooltip = () => {
      tooltip
        .style('opacity', 0)
        .style('left', '-9999px')
        .style('top', '-9999px');
    };

    const container = d3.select(heatmapRef.current);
    container.selectAll('*').remove();

    const squareSize = 18;
    const padding = 2.5;
    const monthPadding = 20;
    const daysInWeek = 7;

    // Define a constant for the corner radius ratio
    const CORNER_RADIUS_RATIO = 0.15;

    // Calculate corner radius based on square size
    const calculateCornerRadius = (size) => {
      // We multiply the square size by our ratio and round to the nearest decimal
      // Math.max ensures we never go below 1 pixel
      return Math.max(1, Math.round(size * CORNER_RADIUS_RATIO));
    };

    // Calculate month data including first day of week
    const months = Array.from({ length: 12 }, (_, i) => {
      const firstDay = new Date(2025, i, 1);
      const lastDay = new Date(2025, i + 1, 0);
      return {
        name: firstDay.toLocaleString('default', { month: 'short' }),
        days: lastDay.getDate(),
        firstDayOfWeek: firstDay.getDay(),
        startDay: Math.floor(
          (firstDay - new Date(2025, 0, 1)) / (1000 * 60 * 60 * 24)
        ),
      };
    });

    // Calculate total width including month padding
    const totalWeeks = months.reduce((acc, month) => {
      return acc + Math.ceil((month.firstDayOfWeek + month.days) / 7);
    }, 0);

    const width = totalWeeks * (squareSize + padding) + 11 * monthPadding;
    const height = daysInWeek * (squareSize + padding);

    // Append SVG with extra space on the left for day initials
    const dayInitialsWidth = 16;
    const svg = container
      .append('svg')
      .attr('width', width + dayInitialsWidth)
      .attr('height', height + 25);

    // Create a group for the main content and translate it to make room for day initials
    const mainGroup = svg
      .append('g')
      .attr('transform', `translate(${dayInitialsWidth}, 0)`);

    // Add day initials
    const dayInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    svg
      .selectAll('.day-initial')
      .data(dayInitials)
      .enter()
      .append('text')
      .attr('class', 'day-initial')
      .attr('x', 6)
      .attr('y', (d, i) => i * (squareSize + padding) + squareSize * 0.75)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#6b7280')
      .text((d) => d);

    // Calculate "today" for reference
    const today = new Date();
    const yearStart = new Date(2025, 0, 1);
    let dayIndex = Math.floor((today - yearStart) / (1000 * 60 * 60 * 24));
    // Make sure dayIndex isn't negative
    if (dayIndex < 0) dayIndex = 0;

    // We'll also define a "nowDayNumber" for comparing to each square
    const nowDayNumber = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));

    // A helper to compute X/Y positions of each day
    const getPosition = (dayNumber) => {
      let monthIndex = 0;
      let daysAccumulated = 0;
      let monthsBeforeCurrent = 0;

      while (
        monthIndex < months.length &&
        daysAccumulated + months[monthIndex].days <= dayNumber
      ) {
        daysAccumulated += months[monthIndex].days;
        monthsBeforeCurrent++;
        monthIndex++;
      }

      const currentMonth = months[monthIndex];
      const dayInMonth = dayNumber - daysAccumulated;
      const monthStartOffset = currentMonth.firstDayOfWeek;
      const adjustedDay = monthStartOffset + dayInMonth;

      let previousWeeks = 0;
      for (let i = 0; i < monthIndex; i++) {
        previousWeeks += Math.ceil(
          (months[i].firstDayOfWeek + months[i].days) / 7
        );
      }

      const currentWeek = Math.floor(adjustedDay / 7);
      const dayOfWeek = adjustedDay % 7;

      return {
        x:
          (previousWeeks + currentWeek) * (squareSize + padding) +
          monthsBeforeCurrent * monthPadding,
        y: dayOfWeek * (squareSize + padding),
      };
    };

    // Create day squares for the entire year (0..364)
    const daysInYear = 365;
    const data = Array.from({ length: daysInYear }, (_, i) => ({
      day: i,
      completed: false,
    }));

    // Convert completedDates to "day numbers"
    const completedDayNumbers = completedDates.map((dateStr) => {
      const dt = new Date(dateStr);
      return Math.floor(dt.getTime() / 86400000);
    });

    const RIPPLE_DURATION = 5000; // Duration of ripple in milliseconds
    const RIPPLE_COLOR = '#ba6306'; // Use your existing completed color
    const MAX_RIPPLE_DISTANCE = 1000; // How many squares away the ripple should travel

    const calculateSquareDistance = (square1, square2) => {
      // Calculate row and column differences
      const week1 = Math.floor(square1.day / 7);
      const day1 = square1.day % 7;
      const week2 = Math.floor(square2.day / 7);
      const day2 = square2.day % 7;

      // Calculate direct distance in grid units
      const dx = week2 - week1;
      const dy = day2 - day1;

      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log(
        `Distance from day ${square1.day} to ${square2.day}: ${distance}`
      );
      return distance;
    };

    // Draw the squares
    mainGroup
      .selectAll('.day-square')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'day-square')
      .attr('width', squareSize)
      .attr('height', squareSize)
      .attr('x', (d) => getPosition(d.day).x)
      .attr('y', (d) => getPosition(d.day).y)
      .attr('rx', calculateCornerRadius(squareSize))
      .attr('ry', calculateCornerRadius(squareSize))

      // Decide fill color
      .attr('fill', (d) => {
        const thisSquareDate = new Date(2025, 0, d.day + 1);
        const thisSquareDayNumber = Math.floor(
          thisSquareDate.getTime() / 86400000
        );

        const isCompleted = completedDayNumbers.includes(thisSquareDayNumber);

        // 1) If thisSquareDayNumber is in the future, make it very light
        if (thisSquareDayNumber > nowDayNumber) {
          return 'rgba(0, 0, 0, 0.05)'; // Future
        }
        // 2) If it's in the past or today but not completed, use a grey color
        if (!isCompleted) {
          return 'rgba(0, 0, 0, 0.2)'; // Past/Today uncompleted
        }
        // 3) If it's completed, color it a distinct color
        return '#ba6306'; // Completed
      })

      // Stroke if it's "today"
      .attr('stroke', (d) => {
        const thisSquareDate = new Date(2025, 0, d.day + 1);
        const thisSquareDayNumber = Math.floor(
          thisSquareDate.getTime() / 86400000
        );
        return thisSquareDayNumber === nowDayNumber ? 'red' : 'none';
      })
      .attr('stroke-width', (d) => {
        const thisSquareDate = new Date(2025, 0, d.day + 1);
        const thisSquareDayNumber = Math.floor(
          thisSquareDate.getTime() / 86400000
        );
        return thisSquareDayNumber === nowDayNumber ? 2 : 0;
      })

      .on('click', function (event, d) {
        hideTooltip();

        const clickedDate = new Date(2025, 0, d.day + 1);
        const clickedDayNumber = Math.floor(clickedDate.getTime() / 86400000);

        if (clickedDayNumber > nowDayNumber) {
          return;
        }

        const clickedSquare = d;

        // Select all squares and apply a more visible ripple effect
        mainGroup.selectAll('.day-square').each(function (squareData) {
          const distance = calculateSquareDistance(clickedSquare, squareData);

          if (distance <= MAX_RIPPLE_DISTANCE) {
            const delay = distance * (RIPPLE_DURATION / MAX_RIPPLE_DISTANCE);

            d3.select(this)
              .transition()
              .delay(delay)
              .duration(600)
              // Add transform scale for more visible effect
              .attr('transform', `scale(1.2)`)
              .style('fill', '#ff9f43') // Bright orange color for visibility
              .transition()
              .duration(200)
              .attr('transform', 'scale(1)')
              .style('fill', function () {
                const thisSquareDate = new Date(2025, 0, squareData.day + 1);
                const thisSquareDayNumber = Math.floor(
                  thisSquareDate.getTime() / 86400000
                );

                if (thisSquareDayNumber > nowDayNumber) {
                  return 'rgba(0, 0, 0, 0.05)';
                }

                const isCompleted =
                  completedDayNumbers.includes(thisSquareDayNumber);
                return isCompleted ? RIPPLE_COLOR : 'rgba(0, 0, 0, 0.2)';
              });
          }
        });

        onCompleteDay(clickedDate);
      })

      .on('mouseover', function (event, d) {
        const date = new Date(2025, 0, d.day + 1);
        tooltip
          .style('opacity', 1)
          .html(`<strong>Date:</strong> ${date.toDateString()}<br/>`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 20 + 'px');
      })
      .on('mousemove', function (event, d) {
        const date = new Date(2025, 0, d.day + 1);
        tooltip
          .html(`<strong>Date:</strong> ${date.toDateString()}<br/>`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 20 + 'px');
      })
      // Updated "mouseleave" to forcibly hide the tooltip
      .on('mouseleave', function () {
        tooltip
          .style('opacity', 0)
          .style('left', '-9999px')
          .style('top', '-9999px');
      });

    // Add month labels
    let currentX = 0;
    months.forEach((month, i) => {
      const monthWeeks = Math.ceil((month.firstDayOfWeek + month.days) / 7);
      const monthWidth = monthWeeks * (squareSize + padding);

      mainGroup
        .append('text')
        .attr('x', currentX + monthWidth / 2)
        .attr('y', height + 16)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', '#6b7280')
        .text(month.name);

      // optional: add lines between months if you want them
      if (i < months.length - 1) {
        // You might need to create a line, not set x1 on the svg itself
        // so let's skip for clarity or adjust it properly.
      }

      currentX += monthWidth + monthPadding;
    });
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
    };
  }, [completedDates, onCompleteDay]);

  return (
    <div className="p-2 rounded shadow">
      <div ref={heatmapRef} className="heatmap-container"></div>
    </div>
  );
};

export default Heatmap;
