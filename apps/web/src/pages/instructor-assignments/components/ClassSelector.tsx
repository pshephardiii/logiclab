import { Link } from 'react-router';
import { ClassSelection } from '../../../features/classroom/components/ClassSelection';
import { listClassrooms } from '../../../api/classrooms/api';
import { routeDefinitions } from '../../../routing/route-definitions';

export function ClassSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ClassSelection
      value={value}
      onChange={onChange}
      loadPage={listClassrooms}
      emptyMessage={
        <>
          Create a class before authoring assignments.{' '}
          <Link to={routeDefinitions.instructorClasses.path}>Manage classes</Link>
        </>
      }
    />
  );
}
