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

/**
 * 탭 내용을 렌더링하는 컴포넌트.
 * 
 * @param {Object} props
 * @param {string} props.title - 위젯 상단에 표시될 제목
 * @param {Function} props.onRemove - 위젯 메뉴에서 '위젯 제거' 클릭 시 호출되는 콜백 함수
 */
function TabComponent({ title, onRemove }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // 메뉴 바깥을 클릭했을 때 메뉴를 닫기 위한 이벤트 핸들러
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 드래그 핸들을 제외한 다른 요소들에서 mousedown 이벤트 막아 의도치 않은 드래그 제한
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

/**
 * 대시보드 메인 레이아웃
 * GridStack 초기화 사이드바 및 탭 배치.
 */
function ShowcaseLayout() {
  const containerRef = useRef(null); // GridStack이 적용될 컨테이너 DOM 참조
  const gridRef = useRef(null); // GridStack 인스턴스 참조
  const [width, setWidth] = useState(0); // 현재 화면 너비 (반응형 컬럼 조정을 위함)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 사이드바 열림/닫힘 상태
  const [isEditable, setIsEditable] = useState(true); // 레이아웃 편집 모드 (드래그/리사이즈 활성화 여부)

  // 로컬 스토리지에서 저장된 레이아웃을 불러오거나 기본 레이아웃을 설정
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

  // 현재 그리드에 배치된 위젯들의 ID 목록
  const [activeWidgetIds, setActiveWidgetIds] = useState(() => initialLayout.map(item => item.id));
  const rootsRef = useRef(new Map()); // 인스턴스를 저장하여 메모리 누수 방지

  // 화면 크기 변경 감지를 위한 ResizeObserver 설정
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

  // GridStack 초기화 및 이벤트 리스너 등록
  useEffect(() => {
    if (!containerRef.current) return;

    if (!gridRef.current) {
      // GridStack 인스턴스 생성
      const grid = GridStack.init(
          {
            cellHeight: 60,
            margin: 10,
            handle: '.drag-handle', // 드래그를 활성화할 CSS 셀렉터
            acceptWidgets: true, // 외부(사이드바)에서 드래그 앤 드롭으로 위젯 추가 허용
            disableOneColumnMode: true, // 모바일에서 강제로 1열 모드로 변하는 것을 방지
            float: true, // 위젯들이 위로 빈 공간을 채우지 않고 자유롭게 배치되도록 설정
            resizable: { handles: 'se', autoHide: false }, // 탭 우측 하단 리사이즈 핸들 설정
            alwaysShowPlaceholder: true, // 드래그 중 배치 예정 위치 항상 표시
            animate: true, // 이동/리사이즈 시 애니메이션 적용
          },
          containerRef.current
      );
      gridRef.current = grid;

      /**
       * GridStack 아이템 내부에 React 컴포넌트를 마운트하는 헬퍼 함수
       * @param {HTMLElement} el - GridStack 위젯 DOM 요소
       * @param {string} title - 위젯 제목
       */
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

      /**
       * 현재 그리드의 위젯 배치 상태를 로컬 스토리지에 저장하는 함수
       */
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

      // 새 위젯이 그리드에 추가되었을 때 발생하는 이벤트
      grid.on('added', (event, items) => {
        items.forEach((item) => {
          // 추가된 위젯에 동적으로 리사이징 제약 조건 적용 (최소/최대 너비 및 높이)
          grid.update(item.el, { minW: 2, maxW: 8, minH: 2, maxH: 6 });
          
          // 사이드바에서 드래그해 올 때 생긴 잔여 DOM 요소 정리
          Array.from(item.el.children).forEach(child => {
            const className = child.className || '';
            if (typeof className === 'string' && className.includes('ui-resizable')) {
              return;
            }
            if (typeof className === 'string' && className.includes('grid-stack-item-content')) {
              child.innerHTML = '';
              return;
            }
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

      // 위젯이 그리드에서 제거되었을 때 발생하는 이벤트
      grid.on('removed', (event, items) => {
        items.forEach((item) => {
          const id = item.el.getAttribute('data-id');
          if (id) {
            setActiveWidgetIds(prev => prev.filter(activeId => activeId !== id));
          }
          if (rootsRef.current.has(item.el)) {
            rootsRef.current.get(item.el).unmount(); // React 컴포넌트 언마운트 처리
            rootsRef.current.delete(item.el);
          }
        });
        saveLayout();
      });

      // 초기 렌더링 시점에 존재하는 기본 위젯들을 초기화
      const staticItems = containerRef.current.querySelectorAll('.grid-stack-item');
      staticItems.forEach(el => {
        grid.update(el, { minW: 2, maxW: 8, minH: 2, maxH: 6 }); // 기본 위젯에 리사이징 제약 적용
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

  // 편집 모드 상태 변경 시 GridStack 활성화/비활성화 처리
  useEffect(() => {
    if (gridRef.current) {
      if (isEditable) {
        gridRef.current.enable();
      } else {
        gridRef.current.disable();
      }
    }
  }, [isEditable]);

  // 사이드바가 열렸을 때 드래그 가능한 아이템 설정
  useEffect(() => {
    if (isSidebarOpen) {
      const timer = setTimeout(() => {
        GridStack.setupDragIn('.sidebar-item', {
          revert: 'invalid', // 유효하지 않은 드롭 위치일 경우 원래 자리로 되돌아감
          scroll: false,
          appendTo: 'body', // 드래그 헬퍼 요소를 body에 추가하여 z-index 문제 방지
          helper: (el) => {
            const clone = el.cloneNode(true);
            clone.style.zIndex = '100';
            return clone;
          },
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen, activeWidgetIds]);

  // 반응형 레이아웃 처리: 브라우저 너비에 따라 GridStack의 전체 컬럼 수를 조정
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || width === 0) return;
    const targetColumn = width < 768 ? 4 : width < 1200 ? 8 : 12;
    if (grid.getColumn() !== targetColumn) {
      grid.column(targetColumn, 'compact'); // 위젯들이 빈자리를 찾아 촘촘하게 압축되어 재정렬
    }
  }, [width]);

  /**
   * 저장된 레이아웃을 초기화하고 페이지를 새로고침하는 함수
   */
  const handleReset = () => {
    localStorage.removeItem('grid-layout');
    window.location.reload();
  };

  /**
   * 레이아웃 편집 모드를 토글하는 함수
   */
  const handleToggleEditMode = () => {
    if (isEditable) {
      setIsSidebarOpen(false); // 편집 모드 종료 시 사이드바도 함께 닫음
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