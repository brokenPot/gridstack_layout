import { useState, useEffect, useRef } from 'react';
import { GridStack } from 'gridstack';
import styled from '@emotion/styled';

// Gridstack 필수 CSS
import 'gridstack/dist/gridstack.css';

// 사이드바 위젯 목록
const SIDEBAR_ITEMS = [
  { id: 'widget-1', title: 'EC2 인스턴스', w: 4, h: 2 },
  { id: 'widget-2', title: 'S3 버킷 요약', w: 3, h: 3 },
  { id: 'widget-3', title: '결제 대시보드', w: 6, h: 2 },
];

function ShowcaseLayout() {
  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. 컨테이너 너비 감시 (반응형 로직용)
  useEffect(() => {
    const handleResize = (entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    };
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. GridStack 초기화 및 외부 드래그 설정
  useEffect(() => {
    if (!containerRef.current) return;

    if (!gridRef.current) {
      gridRef.current = GridStack.init(
          {
            column: 12,
            cellHeight: 60,
            margin: 10,
            handle: '.drag-handle',
            acceptWidgets: true, // 외부 아이템 수락 필수
            disableOneColumnMode: true,
            float: false,
            resizable: { handles: 'se', autoHide: false },
          },
          containerRef.current
      );

      // 외부 아이템(사이드바)을 그리드로 드래그할 수 있게 설정
      GridStack.setupDragIn('.sidebar-item', {
        revert: 'invalid',
        scroll: false,
        appendTo: 'body',
        helper: 'clone'
      });
    }
  }, []);

  // 3. 4-2-1 반응형 로직
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || width === 0) return;

    let targetColumn = 12;
    if (width < 768) targetColumn = 3;
    else if (width < 1200) targetColumn = 6;
    else targetColumn = 12;

    if (grid.getColumn() !== targetColumn) {
      grid.column(targetColumn, 'none');
    }
  }, [width]);

  return (
      <RootContainer>
        <Header>
          <div style={{ fontWeight: 'bold' }}>AWS Dashboard</div>
          <AddButton onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? '닫기' : '위젯 추가'}
          </AddButton>
        </Header>

        <MainLayout>
          <GridWrapper>
            {/* 중요: .grid-stack 클래스가 있는 div에 직접 ref와 min-height를 줌 */}
            <div className="grid-stack" ref={containerRef} style={{ minHeight: '500px' }}>
              <div className="grid-stack-item" gs-w="3" gs-h="2">
                <div className="grid-stack-item-content">
                  <TabItem>
                    <DragHandle className="drag-handle" />
                    <ContentArea>기본 위젯</ContentArea>
                  </TabItem>
                </div>
              </div>
            </div>
          </GridWrapper>

          <Sidebar isOpen={isSidebarOpen}>
            <SidebarHeader>위젯 라이브러리</SidebarHeader>
            <SidebarContent>
              {SIDEBAR_ITEMS.map((item) => (
                  <div
                      key={item.id}
                      className="sidebar-item grid-stack-item" // grid-stack-item 클래스 추가 시 더 안정적
                      gs-w={item.w}
                      gs-h={item.h}
                      style={{ marginBottom: '10px' }}
                  >
                    <SidebarItemInner>
                      <DragIcon>⠿</DragIcon>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>{item.w}x{item.h}</div>
                      </div>
                    </SidebarItemInner>
                  </div>
              ))}
            </SidebarContent>
          </Sidebar>
        </MainLayout>
      </RootContainer>
  );
}

// === Styled Components ===
const RootContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const Header = styled.div`
  background: #232f3e;
  color: white;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AddButton = styled.button`
  background: #ec7211;
  color: white;
  border: none;
  padding: 8px 15px;
  cursor: pointer;
  font-weight: bold;
  border-radius: 2px;
`;

const MainLayout = styled.div`
  display: flex;
  flex: 1;
  position: relative;
  overflow: hidden;
`;

const GridWrapper = styled.div`
  width: 100%;
  background-color: #f1f3f5;
  border-radius: 12px;
  min-height: 600px;

  .grid-stack-item-content {
    inset: 0 !important;
    overflow: visible !important;
  }

  .ui-resizable-se {
    width: 12px !important;
    height: 12px !important;
    right: 4px !important;
    bottom: 4px !important;
    background: none !important;
    cursor: se-resize !important;
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
    rotate: 45deg;
  }

  .ui-resizable-se::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M5 11L11 5M9 11L11 9' stroke='%23879196' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: bottom right;
    opacity: 1 !important;
  }
`;

const Sidebar = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: white;
  box-shadow: -2px 0 5px rgba(0,0,0,0.1);
  transform: translateX(${props => (props.isOpen ? '0' : '100%')});
  transition: transform 0.3s ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #eee;
  font-weight: bold;
`;

const SidebarContent = styled.div`
  flex: 1;
  padding: 15px;
  overflow-y: auto;
`;

const SidebarItemInner = styled.div`
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  display: flex;
  align-items: center;
  cursor: grab;
  &:hover { border-color: #ec7211; }
`;

const DragIcon = styled.div`
  margin-right: 15px;
  color: #ccc;
`;

// 기존 UI 컴포넌트들
const TabItem = styled.div`
  width: 100%;
  height: 100%;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  display: flex;
  position: relative;
`;

const DragHandle = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab !important;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #adb5bd;
  &::before {
    content: '⠿';
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #495057;
  user-select: none;
`;

export default ShowcaseLayout;