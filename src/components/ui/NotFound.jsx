import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import Button from "./Button";
import Message from "./Message";
import { useGlobal } from "../providers/GlobalContext";

function NotFound() {
  const navigate = useNavigate();
  const { loggedIn } = useGlobal();

  return (
    <div className="ogcr-projects">
      <Message
        variant="warning"
        title="Page not found"
        description="That address does not lead anywhere. It may have moved, or the link is wrong."
      />
      <div>
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon size={16} />}
          onClick={() => navigate(loggedIn ? "/overview" : "/")}
        >
          {loggedIn ? "Back to overview" : "Back to the start"}
        </Button>
      </div>
    </div>
  );
}

export default NotFound;
