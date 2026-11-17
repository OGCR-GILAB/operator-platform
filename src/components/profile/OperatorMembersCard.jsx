import { useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon, UserPlusIcon } from "@phosphor-icons/react";
import { AlertDialog, Button, Card, Input, Message, Pill } from "@majistudio/ogcr-design-system";
import DataTable from "../ui/DataTable";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";
import $auth from "../../services/$auth";
import $operators from "../../services/$operators";
import { syncLabel, syncTone } from "../projects/projectPresentation";
import Dialog from "../ui/Dialog";

const emptyInvite = { identifier: "", relationship: "" };

/**
 * The people who act for the operator — `operators/{id}/members/`.
 *
 * A member has to exist locally before they can be added, and the local user is
 * only created on first sign-in, so the add form says so up front rather than
 * leaving it to the error message.
 */
function OperatorMembersCard({ operatorId }) {
  const { me, refreshOperator } = useGlobal();
  const { showToast } = useToast();

  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState(emptyInvite);
  const [inviteErrors, setInviteErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [removing, setRemoving] = useState(null);

  const reload = () => {
    setStatus("loading");
    setReloadToken((value) => value + 1);
  };

  useEffect(() => {
    if (!operatorId) return undefined;

    let cancelled = false;

    $operators.members(operatorId)
      .then((records) => {
        if (cancelled) return;
        setMembers(records);
        setError("");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [operatorId, reloadToken]);

  const isMe = (member) => me?.id != null && String(member.user) === String(me.id);

  const closeInvite = () => {
    if (saving) return;
    setInviting(false);
    setInvite(emptyInvite);
    setInviteErrors({});
  };

  const handleAdd = async () => {
    const identifier = invite.identifier.trim();
    const relationship = invite.relationship.trim();

    if (!identifier || !relationship) {
      setInviteErrors({
        ...(identifier ? {} : { identifier: "Enter a username or an e-mail address." }),
        ...(relationship ? {} : { relationship: "Describe their role at the Operator." }),
      });
      return;
    }

    setSaving(true);
    setInviteErrors({});

    try {
      await $operators.addMember(operatorId, {
        ...(identifier.includes("@") ? { email: identifier } : { username: identifier }),
        relationship,
      });

      showToast({
        variant: "success",
        title: "Member added",
        description: `${identifier} can now work on this Operator's activities.`,
      });

      setSaving(false);
      closeInvite();
      reload();
    } catch (err) {
      if (err?.response?.status === 401) return;

      const fields = $auth.getFieldErrors(err);
      setInviteErrors({
        identifier: fields.username || fields.email || fields.non_field_errors
          || (Object.keys(fields).length ? "" : $auth.getErrorMessage(err)),
        relationship: fields.relationship || "",
      });
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removing) return;

    const leavingMyself = isMe(removing);

    try {
      await $operators.removeMember(operatorId, removing.user);

      showToast({
        variant: "success",
        title: leavingMyself ? "You left the Operator" : "Member removed",
        description: leavingMyself
          ? "You are no longer linked to this Operator."
          : `${removing.username} no longer has access to this Operator.`,
      });

      setRemoving(null);

      // Leaving drops this account's link, so the whole app has to re-read it.
      if (leavingMyself) refreshOperator();
      else reload();
    } catch (err) {
      if (err?.response?.status === 401) return;

      showToast({
        variant: "error",
        title: "Could not remove member",
        description: err?.response?.status === 409
          ? "An Operator must keep at least one member. Add someone else before removing this one."
          : $auth.getErrorMessage(err),
      });
      setRemoving(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "username",
        accessorKey: "username",
        header: "Member",
        cell: ({ row }) => (
          <span>
            {row.original.username}
            {isMe(row.original) ? <span className="text-body-s"> (you)</span> : null}
          </span>
        ),
      },
      { id: "relationship", accessorFn: (row) => row.relationship || "—", header: "Role" },
      {
        id: "sync",
        accessorFn: (row) => row.dcr_sync_status || "local",
        header: "DCR",
        cell: ({ row }) => <Pill tone={syncTone(row.original)}>{syncLabel(row.original)}</Pill>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="text"
            size="s"
            disabled={members.length <= 1}
            onClick={() => setRemoving(row.original)}
          >
            {isMe(row.original) ? "Leave" : "Remove"}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members.length, me?.id],
  );

  return (
    <Card
      className="ogcr-profile__card"
      title="Operator members"
      subtitle="Everyone who can prepare and submit activities for this Operator."
      trailing={(
        <Button
          variant="text"
          size="s"
          iconLeft={<ArrowClockwiseIcon size={16} />}
          onClick={reload}
        >
          Refresh
        </Button>
      )}
    >
      <div className="ogcr-profile__form">
        {status === "error" && (
          <Message state="error" title="Could not load members" description={error} />
        )}

        <DataTable
          columns={columns}
          data={members}
          loading={status === "loading"}
          skeletonRows={2}
          ariaLabel="Operator members table"
          emptyText="No members yet."
        />

        <div className="ogcr-profile__actions">
          <Button
            variant="outlined"
            iconLeft={<UserPlusIcon size={16} />}
            onClick={() => setInviting(true)}
          >
            Add member
          </Button>
        </div>
      </div>

      {inviting && (
        <Dialog
          open
          onOpenChange={(open) => { if (!open) closeInvite(); }}
          size="s"
          title="Add a member"
          description="They must have signed in to the Operator Platform at least once."
          primaryAction={{
            label: saving ? "Adding…" : "Add member",
            onClick: handleAdd,
            disabled: saving,
            closeOnClick: false,
          }}
          secondaryAction={{ label: "Cancel", disabled: saving }}
        >
          <div className="ogcr-profile__form">
            <Input
              label="Username or e-mail"
              value={invite.identifier}
              onChange={(event) => setInvite({ ...invite, identifier: event.target.value })}
              placeholder="jane.doe or jane@example.com"
              error={Boolean(inviteErrors.identifier)}
              helperText={inviteErrors.identifier}
              required
            />
            <Input
              label="Relationship to the Operator"
              value={invite.relationship}
              onChange={(event) => setInvite({ ...invite, relationship: event.target.value })}
              placeholder="e.g., Managing Director, Employee, Accountant"
              error={Boolean(inviteErrors.relationship)}
              helperText={inviteErrors.relationship}
              required
            />
          </div>
        </Dialog>
      )}

      {removing && (
        <AlertDialog
          open
          onOpenChange={(open) => { if (!open) setRemoving(null); }}
          tone="danger"
          title={isMe(removing) ? "Leave this Operator?" : "Remove this member?"}
          description={isMe(removing)
            ? "You will lose access to its activities, parcels and documents."
            : "They will lose access to this Operator's activities, parcels and documents."}
          confirmLabel={isMe(removing) ? "Leave" : "Remove"}
          onConfirm={handleRemove}
        >
          <p className="text-body-s">
            {removing.username}{removing.relationship ? ` — ${removing.relationship}` : ""}
          </p>
        </AlertDialog>
      )}
    </Card>
  );
}

export default OperatorMembersCard;
