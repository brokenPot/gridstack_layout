import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GridStack } from 'gridstack';
import styled from '@emotion/styled';
import 'gridstack/dist/gridstack.css';

const SIDEBAR_ITEMS = [
  { id: 'default-widget', title: '기본 위젯 (EC2)', w: 4, h: 3 },
  { id: 'widget-1', title: 'EC2 인스턴스', w: 4, h: 2 },
  { id: 'widget-2', title: 'S3 버킷 요약', w: 3, h: 3 },
  { id: 'widget-3', title: '결제 대시보드', w: 6, h: 2 },
];

function TabComponent({ title, onRemove }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 드래그 핸들을 제외한 다른 요소들에서 mousedown 이벤트 막아 드래그 제한
  const stopDrag = (e) => {
    e.stopPropagation();
  };

  return (
      <TabItem>
        <WidgetHeader>
          <DragHandle className="drag-handle" title="드래그하여 이동" />
          <WidgetTitle onMouseDown={stopDrag}>{title}</WidgetTitle>
          <MenuContainer ref={menuRef} onMouseDown={stopDrag}>
            <MenuButton onClick={() => setShowMenu(!showMenu)}>⋮</MenuButton>
            {showMenu && (
                <Dropdown>
                  <DropdownItem onClick={onRemove}>위젯 제거</DropdownItem>
                </Dropdown>
            )}
          </MenuContainer>
        </WidgetHeader>
        <ContentArea onMouseDown={stopDrag}>
          <div style={{ color: '#adb5bd', fontSize: '12px' }}>위젯 데이터 영역</div>
        </ContentArea>
        <Divider onMouseDown={stopDrag} />
        <WidgetFooter onMouseDown={stopDrag}>
          <FooterLink href="https://aws.amazon.com/" target="_blank" rel="noopener noreferrer">
            상세 보기 &rsaquo;
          </FooterLink>
        </WidgetFooter>
      </TabItem>
  );
}

function ShowcaseLayout() {
  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditable, setIsEditable] = useState(true);

  const [initialLayout] = useState(() => {
    const saved = localStorage.getItem('grid-layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse layout from localStorage', e);
      }
    }
    return [
      { id: 'default-widget', title: '기본 위젯 (EC2)', w: 4, h: 3, x: 0, y: 0 }
    ];
  });

  const [activeWidgetIds, setActiveWidgetIds] = useState(() => initialLayout.map(item => item.id));
  const rootsRef = useRef(new Map());

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

  useEffect(() => {
    if (!containerRef.current) return;

    if (!gridRef.current) {
      const grid = GridStack.init(
          {
            cellHeight: 60,
            margin: 10,
            handle: '.drag-handle',
            acceptWidgets: true,
            disableOneColumnMode: true,
            float: true,
            resizable: { handles: 'se', autoHide: false },
            minW: 2,
            maxW: 12,
            minH: 2,
            maxH: 8,
            alwaysShowPlaceholder: true,
            animate: true,
          },
          containerRef.current
      );
      gridRef.current = grid;

      const renderWidget = (el, title) => {
        let contentEl = el.querySelector('.grid-stack-item-content');
        if (!contentEl) {
          contentEl = document.createElement('div');
          contentEl.className = 'grid-stack-item-content';
          el.appendChild(contentEl);
        }
        if (rootsRef.current.has(el)) rootsRef.current.get(el).unmount();
        const root = ReactDOM.createRoot(contentEl);
        root.render(<TabComponent title={title} onRemove={() => grid.removeWidget(el)} />);
        rootsRef.current.set(el, root);
      };

      const saveLayout = () => {
        if (!gridRef.current) return;
        const layout = gridRef.current.engine.nodes.map(node => ({
          id: node.el.getAttribute('data-id'),
          title: node.el.getAttribute('data-title'),
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h
        }));
        if (layout.length > 0) {
          localStorage.setItem('grid-layout', JSON.stringify(layout));
        } else {
          localStorage.removeItem('grid-layout');
        }
      };

      grid.on('change', saveLayout);

      grid.on('added', (event, items) => {
        items.forEach((item) => {
          // 수정: innerHTML = '' 대신, 리사이즈 핸들은 남겨두고 잔상만 제거합니다.
          Array.from(item.el.children).forEach(child => {
            const className = child.className || '';
            // GridStack이 생성한 리사이즈 핸들은 지우지 않습니다.
            if (typeof className === 'string' && className.includes('ui-resizable')) {
              return;
            }
            // 기존 콘텐츠 영역이 있다면 내용물만 지웁니다.
            if (typeof className === 'string' && className.includes('grid-stack-item-content')) {
              child.innerHTML = '';
              return;
            }
            // 나머지 사이드바에서 딸려온 DOM(잔상)은 삭제합니다.
            item.el.removeChild(child);
          });

          const id = item.el.getAttribute('data-id');
          const title = item.el.getAttribute('data-title') || '새 위젯';
          if (id) {
            setActiveWidgetIds(prev => Array.from(new Set([...prev, id])));
          }
          renderWidget(item.el, title);
        });
        saveLayout();
      });

      grid.on('removed', (event, items) => {
        items.forEach((item) => {
          const id = item.el.getAttribute('data-id');
          if (id) {
            setActiveWidgetIds(prev => prev.filter(activeId => activeId !== id));
          }
          if (rootsRef.current.has(item.el)) {
            rootsRef.current.get(item.el).unmount();
            rootsRef.current.delete(item.el);
          }
        });
        saveLayout();
      });

      const staticItems = containerRef.current.querySelectorAll('.grid-stack-item');
      staticItems.forEach(el => {
        renderWidget(el, el.getAttribute('data-title'));
      });
    }

    return () => {
      if (gridRef.current) {
        gridRef.current.destroy(false);
        gridRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gridRef.current) {
      if (isEditable) {
        gridRef.current.enable();
      } else {
        gridRef.current.disable();
      }
    }
  }, [isEditable]);

  useEffect(() => {
    if (isSidebarOpen) {
      const timer = setTimeout(() => {
        GridStack.setupDragIn('.sidebar-item', {
          revert: 'invalid',
          scroll: false,
          appendTo: 'body',
          helper: 'clone',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen, activeWidgetIds]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || width === 0) return;
    let targetColumn = width < 768 ? 4 : width < 1200 ? 8 : 12;
    if (grid.getColumn() !== targetColumn) grid.column(targetColumn, 'none');
  }, [width]);

  const handleReset = () => {
    localStorage.removeItem('grid-layout');
    window.location.reload();
  };

  const handleToggleEditMode = () => {
    if (isEditable) {
      setIsSidebarOpen(false);
    }
    setIsEditable(prev => !prev);
  };

  return (
      <RootContainer>
        <Header>
          <div style={{ fontWeight: 'bold' }}>AWS Dashboard</div>
          <HeaderActions>
            <EditModeButton onClick={handleToggleEditMode}>
              {isEditable ? '수정 완료' : '레이아웃 수정'}
            </EditModeButton>
            <ResetButton onClick={handleReset} disabled={!isEditable}>초기화</ResetButton>
            <AddButton onClick={() => setIsSidebarOpen(!isSidebarOpen)} disabled={!isEditable}>
              {isSidebarOpen ? '닫기' : '위젯 추가'}
            </AddButton>
          </HeaderActions>
        </Header>

        <MainLayout>
          <GridWrapper>
            <div className={`grid-stack ${!isEditable ? 'is-static' : ''}`} ref={containerRef}>
              {initialLayout.map(item => (
                <div
                    key={item.id}
                    className="grid-stack-item"
                    gs-x={item.x}
                    gs-y={item.y}
                    gs-w={item.w}
                    gs-h={item.h}
                    data-id={item.id}
                    data-title={item.title}
                ></div>
              ))}
            </div>
          </GridWrapper>

          <Sidebar isOpen={isSidebarOpen}>
            <SidebarHeader>위젯 라이브러리</SidebarHeader>
            <SidebarContent>
              {SIDEBAR_ITEMS
                  .filter(item => !activeWidgetIds.includes(item.id))
                  .map((item) => (
                      <div
                          key={item.id}
                          className="sidebar-item grid-stack-item"
                          gs-w={item.w}
                          gs-h={item.h}
                          data-id={item.id}
                          data-title={item.title}
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

const GridWrapper = styled.div`
  flex: 1;
  padding: 15px;
  overflow-y: auto;

  .grid-stack {
    min-height: 600px;
    border: 1px solid gray;
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.02);
    transition: all 0.2s ease;
  }
  
  .grid-stack.is-static .drag-handle,
  .grid-stack.is-static .menu-container,
  .grid-stack.is-static .ui-resizable-se {
    display: none;
  }

  .grid-stack-placeholder > .placeholder-content {
    background: #a8a8a8 !important;
    margin: 5px;
    border-radius: 8px;
  }

  .grid-stack-item-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    border: 1px solid #e9ecef;
    inset: 0 !important;
    overflow: visible !important;
    display: flex;
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
    z-index: 30 !important;
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
  }
`;

const RootContainer = styled.div` display: flex; flex-direction: column; height: 100vh; background-color: #f8f9fa; `;
const Header = styled.div` background: #232f3e; color: white; padding: 0 20px; height: 56px; display: flex; justify-content: space-between; align-items: center; z-index: 1100; `;
const HeaderActions = styled.div` display: flex; align-items: center; `;

const EditModeButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
  margin-right: 10px;
  &:hover { background: #0069d9; }
  &:disabled {
    background: #5a6268;
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const ResetButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
  margin-right: 10px;
  &:hover { background: #5a6268; }
  &:disabled {
    background: #5a6268;
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const AddButton = styled.button`
  background: #ec7211;
  color: white;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
  &:hover { background: #d6650a; }
  &:disabled {
    background: #d6650a;
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const MainLayout = styled.div` display: flex; flex: 1; position: relative; overflow: hidden; `;
const TabItem = styled.div` width: 100%; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; `;
const WidgetHeader = styled.div` height: 44px; position: relative; flex-shrink: 0; `;
const DragHandle = styled.div` position: absolute; top: 8px; left: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: grab !important; background-color: #f1f3f5; border-radius: 4px; color: #adb5bd; z-index: 10; &::before { content: '⠿'; font-size: 16px; } &:hover { background-color: #e9ecef; color: #495057; } `;
const WidgetTitle = styled.div` position: absolute; top: 8px; left: 44px; right: 44px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #495057; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: none; `;
const MenuContainer = styled.div` position: absolute; top: 8px; right: 8px; z-index: 20; `;
const MenuButton = styled.button` background: none; border: none; width: 28px; height: 28px; font-size: 18px; cursor: pointer; color: #adb5bd; display: flex; align-items: center; justify-content: center; border-radius: 4px; &:hover { background: #f1f3f5; color: #495057; } `;
const Dropdown = styled.div` position: absolute; right: 0; top: 32px; background: white; border: 1px solid #dee2e6; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border-radius: 6px; min-width: 120px; overflow: hidden; z-index: 1000; `;
const DropdownItem = styled.div` padding: 10px 14px; font-size: 13px; cursor: pointer; color: #e03131; font-weight: 500; &:hover { background: #fff5f5; } `;
const ContentArea = styled.div` flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px; font-weight: 600; color: #343a40; text-align: center; word-break: keep-all; user-select: none; overflow: auto; `;
const Divider = styled.div` height: 1px; background-color: #e9ecef; margin: 0 10px; `;
const WidgetFooter = styled.div` height: 32px; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; background-color: #fff; border-radius: 0 0 8px 8px; `;
const FooterLink = styled.a` font-size: 11px; color: #007bff; text-decoration: none; font-weight: 600; &:hover { text-decoration: underline; } `;
const Sidebar = styled.div` position: absolute; right: 0; top: 0; bottom: 0; width: 280px; background: white; box-shadow: -4px 0 15px rgba(0,0,0,0.08); transform: translateX(${props => (props.isOpen ? '0' : '100%')}); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1050; display: flex; flex-direction: column; `;
const SidebarHeader = styled.div` padding: 20px; border-bottom: 1px solid #f1f3f5; font-weight: bold; font-size: 16px; `;
const SidebarContent = styled.div` flex: 1; padding: 15px; overflow-y: auto; `;
const SidebarItemInner = styled.div` padding: 12px; border: 1px solid #e9ecef; border-radius: 8px; background: white; display: flex; align-items: center; cursor: grab; transition: all 0.2s; &:hover { border-color: #ec7211; box-shadow: 0 4px 8px rgba(0,0,0,0.05); transform: translateY(-2px); } `;
const DragIcon = styled.div` margin-right: 12px; color: #dee2e6; font-size: 18px; `;

export default ShowcaseLayout;