import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GridStack } from 'gridstack';
import styled from '@emotion/styled';
import 'gridstack/dist/gridstack.css';

// 사이드바 위젯 목록
const SIDEBAR_ITEMS = [
    { id: 'widget-1', title: 'EC2 인스턴스', w: 4, h: 2 },
    { id: 'widget-2', title: 'S3 버킷 요약', w: 3, h: 3 },
    { id: 'widget-3', title: '결제 대시보드', w: 6, h: 2 },
];

// 위젯 내부 콘텐츠 컴포넌트
function WidgetContent({ title, onRemove }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    // 메뉴 바깥 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <TabItem>
            <DragHandle className="drag-handle" />
            <ContentArea>{title}</ContentArea>

            <MenuContainer ref={menuRef}>
                <MenuButton onClick={() => setShowMenu(!showMenu)}>⋮</MenuButton>
                {showMenu && (
                    <Dropdown>
                        <DropdownItem onClick={onRemove}>위젯 제거</DropdownItem>
                    </Dropdown>
                )}
            </MenuContainer>
        </TabItem>
    );
}

function ShowcaseLayout() {
    const containerRef = useRef(null);
    const gridRef = useRef(null);
    const [width, setWidth] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // React Root들을 관리하기 위한 Map (메모리 누수 방지 및 언마운트용)
    const rootsRef = useRef(new Map());

    // 1. 컨테이너 너비 감시
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

    // 2. GridStack 초기화 및 이벤트 설정
    useEffect(() => {
        if (!containerRef.current) return;

        if (!gridRef.current) {
            const grid = GridStack.init(
                {
                    column: 12,
                    cellHeight: 60,
                    margin: 10,
                    handle: '.drag-handle',
                    acceptWidgets: true,
                    disableOneColumnMode: true,
                    float: false,
                    resizable: { handles: 'se', autoHide: false },
                },
                containerRef.current
            );
            gridRef.current = grid;

            // 위젯 엘리먼트에 React 컴포넌트를 렌더링하는 함수
            const renderWidget = (el, title) => {
                let contentEl = el.querySelector('.grid-stack-item-content');
                if (!contentEl) {
                    contentEl = document.createElement('div');
                    contentEl.className = 'grid-stack-item-content';
                    el.appendChild(contentEl);
                }

                // 기존에 렌더링된 Root가 있다면 정리
                if (rootsRef.current.has(el)) {
                    rootsRef.current.get(el).unmount();
                }

                const root = ReactDOM.createRoot(contentEl);
                root.render(
                    <WidgetContent
                        title={title}
                        onRemove={() => grid.removeWidget(el)}
                    />
                );
                rootsRef.current.set(el, root);
            };

            // 새로운 위젯이 추가될 때 호출 (드래그 드롭 포함)
            grid.on('added', (event, items) => {
                items.forEach((item) => {
                    const title = item.el.getAttribute('data-title') || '새 위젯';
                    renderWidget(item.el, title);
                });
            });

            // 위젯이 제거될 때 React Root 정리
            grid.on('removed', (event, items) => {
                items.forEach((item) => {
                    if (rootsRef.current.has(item.el)) {
                        rootsRef.current.get(item.el).unmount();
                        rootsRef.current.delete(item.el);
                    }
                });
            });

            // 초기 정적 위젯 렌더링
            const staticItems = containerRef.current.querySelectorAll('.grid-stack-item');
            staticItems.forEach(el => {
                renderWidget(el, el.getAttribute('data-title') || '기본 위젯');
            });

            // 사이드바 드래그 설정
            GridStack.setupDragIn('.sidebar-item', {
                revert: 'invalid',
                scroll: false,
                appendTo: 'body',
                helper: 'clone'
            });
        }

        return () => {
            if (gridRef.current) {
                gridRef.current.destroy(false);
                gridRef.current = null;
            }
        };
    }, []);

    // 3. 반응형 컬럼 조절
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid || width === 0) return;
        let targetColumn = width < 768 ? 3 : width < 1200 ? 6 : 12;
        if (grid.getColumn() !== targetColumn) grid.column(targetColumn, 'none');
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
                    <div className="grid-stack" ref={containerRef} style={{ minHeight: '500px' }}>
                        {/* 초기 위젯 예시 */}
                        <div className="grid-stack-item" gs-w="3" gs-h="2" data-title="기본 위젯"></div>
                    </div>
                </GridWrapper>

                <Sidebar isOpen={isSidebarOpen}>
                    <SidebarHeader>위젯 라이브러리</SidebarHeader>
                    <SidebarContent>
                        {SIDEBAR_ITEMS.map((item) => (
                            <div
                                key={item.id}
                                className="sidebar-item grid-stack-item"
                                gs-w={item.w}
                                gs-h={item.h}
                                data-title={item.title} // 드래그 시 제목 전달용
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

// === Styled Components (수정 및 추가) ===

const MenuContainer = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 100;
`;

const MenuButton = styled.button`
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #adb5bd;
    padding: 0 5px;
    border-radius: 4px;
    &:hover { background: #f1f3f5; color: #495057; }
`;

const Dropdown = styled.div`
    position: absolute;
    right: 0;
    top: 30px;
    background: white;
    border: 1px solid #dee2e6;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-radius: 4px;
    min-width: 100px;
    overflow: hidden;
`;

const DropdownItem = styled.div`
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    color: #e03131;
    white-space: nowrap;
    &:hover { background: #fff5f5; }
`;

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
    z-index: 1000;
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

const TabItem = styled.div`
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
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
    &::before { content: '⠿'; }
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