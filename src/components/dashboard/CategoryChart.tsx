import { Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ArrowUpRight } from 'lucide-react';

interface AssetsByCategory {
  name: string;
  value: number;
  color: string;
}

interface CategoryChartProps {
  data: AssetsByCategory[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = data.map((item) => ({ ...item, fill: item.color }));

  const chartConfig = data.reduce((config, item) => {
    config[item.name] = { label: item.name, color: item.color };
    return config;
  }, {} as ChartConfig);

  return (
    <Card className="border shadow-card flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <CardTitle className="text-lg font-semibold">Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" />
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
