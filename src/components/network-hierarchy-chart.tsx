"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter } from '@/lib/types';

interface ChartData {
    name: string;
    value: number;
    children?: ChartData[];
}

const buildChartData = (users: User[], voters: Voter[]): ChartData => {
    const root: ChartData = {
        name: "EstrategaCRM",
        value: 0,
        children: [],
    };

    if (!users || users.length === 0) {
        return root;
    }

    const userMap = new Map<string, ChartData>();

    // First pass: create all user nodes
    users.forEach(user => {
        const voterCount = voters.filter(v => v.promoterId === user.id).length;
        userMap.set(user.id, {
            name: `${user.firstName} ${user.lastName}`,
            value: voterCount > 0 ? voterCount : 1, // Assign a minimum value to ensure visibility
            children: [],
        });
    });
    
    const topLevelNodes: ChartData[] = [];

    // Second pass: build the hierarchy
    users.forEach(user => {
        const userNode = userMap.get(user.id);
        if (!userNode) return;

        if (user.parentId && userMap.has(user.parentId)) {
            const parentNode = userMap.get(user.parentId);
            parentNode?.children?.push(userNode);
        } else {
            // Only add nodes without a parent to the top level, excluding the super admin
            if (user.email !== 'axdrcys@gmail.com') {
                 topLevelNodes.push(userNode);
            }
        }
    });

    root.children = topLevelNodes;
    
    return root;
};


interface NetworkHierarchyChartProps {
    users: User[];
    voters: Voter[];
}

export const NetworkHierarchyChart = ({ users, voters }: NetworkHierarchyChartProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const data = React.useMemo(() => buildChartData(users, voters), [users, voters]);

    useLayoutEffect(() => {
        if (!chartRef.current) return;

        let root = am5.Root.new(chartRef.current);

        root.setThemes([
            am5themes_Animated.new(root)
        ]);

        // Create series
        let series = root.container.children.push(
            am5hierarchy.Tree.new(root, {
                downDepth: 1,
                initialDepth: 5,
                topDown: true,
                orientation: "vertical",
                valueField: "value",
                categoryField: "name",
                childDataField: "children",
                nodePaddingOuter: 20,
                nodePaddingInner: 20,
            })
        );
        
        series.circles.template.setAll({
            radius: 7,
        });

        series.outerCircles.template.setAll({
            radius: 7,
        });
        
        series.labels.template.setAll({
            populateText: true,
            fontSize: 12,
            oversizedBehavior: "none"
        });

        series.links.template.set("strokeWidth", 2);

        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        // Make stuff animate on load
        series.appear(1000, 100);

        return () => {
            root.dispose();
        };
    }, [data]);

    if (data.children?.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay datos de red para mostrar.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
