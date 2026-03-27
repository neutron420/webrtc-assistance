"use client";

import * as React from 'react';
import { PieChart, pieArcLabelClasses } from '@mui/x-charts/PieChart';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useDrawingArea } from '@mui/x-charts/hooks';
import { styled } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

interface PerformanceDatum {
  Category: 'Communication' | 'Technical' | 'Confidence' | 'Preparation';
  Level: 'Proficient' | 'Developing';
  Count: number;
}

interface ChartDatum {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

type CategoryType = 'Communication' | 'Technical' | 'Confidence' | 'Preparation';

// Convert hex color to rgba with opacity
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const StyledText = styled('text')(({ theme }: { theme: Theme }) => ({
  fill: theme.palette.mode === 'dark' ? '#fff' : theme.palette.text.primary,
  textAnchor: 'middle',
  dominantBaseline: 'central',
  fontSize: 16,
  fontWeight: 'bold',
}));

interface PieCenterLabelProps {
  children: React.ReactNode;
}

function PieCenterLabel({ children }: PieCenterLabelProps): React.ReactElement {
  const { width, height, left, top } = useDrawingArea();
  return (
    <StyledText x={left + width / 2} y={top + height / 2}>
      {children}
    </StyledText>
  );
}

type ViewType = 'category' | 'level';

export default function InterviewPieChart({ stats, view }: { stats: any, view: 'category' | 'level' }) {
  
  // Dynamic Data Logic
  const sessions = stats?.sessions || [];
  
  const performanceData: PerformanceDatum[] = [
    { 
      Category: 'Communication', 
      Level: 'Proficient', 
      Count: sessions.reduce((acc: number, s: any) => acc + (s.communication_score >= 70 ? 1 : 0), 0) 
    },
    { 
      Category: 'Communication', 
      Level: 'Developing', 
      Count: sessions.reduce((acc: number, s: any) => acc + (s.communication_score < 70 ? 1 : 0), 0) 
    },
    { 
      Category: 'Technical', 
      Level: 'Proficient', 
      Count: sessions.reduce((acc: number, s: any) => acc + (s.technical_score >= 70 ? 1 : 0), 0) 
    },
    { 
      Category: 'Technical', 
      Level: 'Developing', 
      Count: sessions.reduce((acc: number, s: any) => acc + (s.technical_score < 70 ? 1 : 0), 0) 
    },
    { 
      Category: 'Confidence', 
      Level: 'Proficient', 
      Count: sessions.reduce((acc: number, s: any) => acc + (s.confidence_score >= 70 ? 1 : 0), 0) 
    },
    { 
      Category: 'Confidence', 
      Level: 'Developing', 
      Count: sessions.reduce((acc: number, s: any) => acc + (s.confidence_score < 70 ? 1 : 0), 0) 
    },
  ];

  const categories: CategoryType[] = ['Communication', 'Technical', 'Confidence'];
  const totalCount = performanceData.reduce((acc, item) => acc + item.Count, 0) || 1;

  const categoryColors: Record<CategoryType, string> = {
    'Communication': '#14b8a6', // teal
    'Technical': '#3b82f6', // blue
    'Confidence': '#a855f7', // purple
    'Preparation': '#f59e0b', // amber
  };

  const categoryData: ChartDatum[] = categories.map((cat) => {
    const catTotal = performanceData
      .filter((item) => item.Category === cat)
      .reduce((acc, item) => acc + item.Count, 0);
    return {
      id: cat,
      label: cat,
      value: catTotal,
      percentage: (catTotal / totalCount) * 100,
      color: categoryColors[cat],
    };
  });

  const categoryLevelData: ChartDatum[] = categories.flatMap((cat) => {
    const catTotal = categoryData.find((d) => d.id === cat)?.value || 1;
    const baseColor = categoryColors[cat];
    return performanceData
      .filter((item) => item.Category === cat)
      .map((item) => ({
        id: `${cat}-${item.Level}`,
        label: item.Level,
        value: item.Count,
        percentage: (item.Count / catTotal) * 100,
        color: item.Level === 'Proficient' ? baseColor : `${baseColor}60`,
      }));
  });

  const levelData: ChartDatum[] = [
    {
      id: 'Proficient',
      label: 'Proficient',
      value: performanceData.filter(i => i.Level === 'Proficient').reduce((a, b) => a + b.Count, 0),
      percentage: 0,
      color: '#10b981',
    },
    {
      id: 'Developing',
      label: 'Developing',
      value: performanceData.filter(i => i.Level === 'Developing').reduce((a, b) => a + b.Count, 0),
      percentage: 0,
      color: '#f59e0b',
    }
  ];

  const middleRadius = 110;

  // Final validation to ensure chart is never empty
  const isDataEmpty = categoryData.every(d => d.value === 0);
  const displayCategoryData = isDataEmpty ? [
    { id: '1', label: 'Comm.', value: 1, percentage: 33, color: categoryColors.Communication },
    { id: '2', label: 'Tech.', value: 1, percentage: 33, color: categoryColors.Technical },
    { id: '3', label: 'Conf.', value: 1, percentage: 33, color: categoryColors.Confidence }
  ] : categoryData;

  const displayLevelData = isDataEmpty ? [
    { id: 'l1', label: 'Proficient', value: 2, percentage: 66, color: '#10b981' },
    { id: 'l2', label: 'Developing', value: 1, percentage: 33, color: '#f59e0b' }
  ] : levelData;

  const finalCategoryLevelData = isDataEmpty ? [] : categoryLevelData;


  const innerRadius = 70;

  return (
    <Box sx={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: '100%', height: 320, display: 'flex', justifyContent: 'center' }}>
          <PieChart
            series={[
              {
                innerRadius,
                outerRadius: middleRadius,
                data: view === 'category' ? displayCategoryData : displayLevelData,
                paddingAngle: 5,
                cornerRadius: 8,
                highlightScope: { fade: 'global', highlight: 'item' },
              },
              {
                innerRadius: middleRadius + 8,
                outerRadius: middleRadius + 22,
                data: finalCategoryLevelData,
                paddingAngle: 2,
                cornerRadius: 4,
              },
            ]}
            sx={{
              [`& .${pieArcLabelClasses.root}`]: {
                display: 'none', // Hide labels inside since they overlap
              },
            }}
            hideLegend
          >
            <PieCenterLabel>{view === 'category' ? 'SKILLS' : 'LEVELS'}</PieCenterLabel>
          </PieChart>
      </Box>
    </Box>
  );
}
