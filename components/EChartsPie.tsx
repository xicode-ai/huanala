import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChartData } from '../types';

interface EChartsPieProps {
  data: ChartData[];
}

export const EChartsPie: React.FC<EChartsPieProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'svg' });
    }

    const option = {
      series: [
        {
          name: 'Distribution',
          type: 'pie',
          radius: ['60%', '90%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            scale: false,
            label: {
              show: false,
            }
          },
          labelLine: {
            show: false
          },
          data: data.map(item => ({
            value: item.value,
            name: item.name,
            itemStyle: {
                color: item.color,
                borderRadius: 5,
                borderColor: '#fff',
                borderWidth: 2
            }
          }))
        }
      ],
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}%',
        confine: true
      }
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};
