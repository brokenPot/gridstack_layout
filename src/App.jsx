import ShowcaseLayout from "./ShowcaseLayout.jsx";
import styled from "@emotion/styled";

function App() {

  return (
    <AppWrapper>
    <ShowcaseLayout/>
    </AppWrapper>
  )
}

const AppWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;


export default App
