import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useAccountPath } from '../../../routing/hooks/useAccountPath';
import { Link } from 'react-router';
import { ClassSelection } from '../../../features/classroom/components/ClassSelection';
import * as classroomsApi from '../../../api/classrooms/api';
import { routeDefinitions } from '../../../routing/route-definitions';

export function ClassSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { listClassrooms } = useResourceApi(classroomsApi);
  const accountPath = useAccountPath();
  return (
    <ClassSelection
      value={value}
      onChange={onChange}
      loadPage={listClassrooms}
      emptyMessage={
        <>
          Create a class before authoring assignments.{' '}
          <Link to={accountPath(routeDefinitions.instructorClasses.path)}>Manage classes</Link>
        </>
      }
    />
  );
}
