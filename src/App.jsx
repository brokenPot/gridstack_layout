import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard.jsx";
import styled from "@emotion/styled";

// api 모킹 데이터
const fetchDashboardData = async () => {
  const DEFAULT_ITEMS = [
    { id: 'default-widget', title: '기본 위젯 (EC2)', w: 4, h: 3, x: 0, y: 0 },
  ];

  const SIDEBAR_ITEMS = [
    { id: 'default-widget', title: '기본 위젯 (EC2)', w: 4, h: 3 },
    { id: 'widget-1', title: 'EC2 인스턴스', w: 4, h: 2 },
    { id: 'widget-2', title: 'S3 버킷 요약', w: 3, h: 3 },
    { id: 'widget-3', title: '결제 대시보드', w: 6, h: 2 },
    { id: 'widget-4', title: '기타1', w: 4, h: 2 },
    { id: 'widget-5', title: '기타2', w: 4, h: 2 },
    { id: 'widget-6', title: '기타3', w: 4, h: 2 },
    { id: 'widget-7', title: '기타4', w: 4, h: 2 },
    { id: 'widget-8', title: '기타5', w: 4, h: 2 },
    { id: 'widget-9', title: '기타6', w: 4, h: 2 },
    { id: 'widget-10', title: '기타7', w: 4, h: 2 },
    { id: 'widget-11', title: '기타8', w: 4, h: 2 },
    { id: 'widget-12', title: '기타9', w: 4, h: 2 },
  ];

  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    defaultItems: DEFAULT_ITEMS,
    sidebarItems: SIDEBAR_ITEMS,
  };
};

function App() {
  const [loading, setLoading] = useState(true);
  const [defaultItems, setDefaultItems] = useState([]);
  const [sidebarItems, setSidebarItems] = useState([]);

  // api 호출 방식 모킹
  useEffect(() => {
    const loadData = async () => {
      const { defaultItems, sidebarItems } = await fetchDashboardData();
      setDefaultItems(defaultItems);
      setSidebarItems(sidebarItems);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AppWrapper>
      <Dashboard
        width="800px"
        height="400px"
        title="SQL 대시보드"
        currentTabs={defaultItems}
        sidebarTabs={sidebarItems}
      />
    </AppWrapper>
  );
}

const AppWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

export default App;
