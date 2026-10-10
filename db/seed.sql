DO $$
DECLARE
  v_user uuid; v_course uuid; v_module uuid; v_lecture uuid; v_topic uuid;
  v_ontology uuid; v_epistemology uuid; v_axiology uuid; v_source uuid; v_project uuid;
BEGIN
  INSERT INTO users(email,password_hash,role) VALUES ('clive@example.com', crypt('AicScholar!2026', gen_salt('bf')),'owner')
  ON CONFLICT(email) DO UPDATE SET role=EXCLUDED.role,updated_at=now() RETURNING id INTO v_user;
  IF v_user IS NULL THEN SELECT id INTO v_user FROM users WHERE email='clive@example.com'; END IF;
  INSERT INTO profiles(user_id,full_name,preferred_name,academic_level,field,mentor)
  VALUES(v_user,'Clive Ebo Barton-Odro','Clive','PhD','Information Technology','Dr. David King Boison')
  ON CONFLICT(user_id) DO UPDATE SET updated_at=now();
  INSERT INTO courses(user_id,code,title,description,is_demo) VALUES(v_user,'RM-001','Research Methods','First Edition demonstration course',true)
  ON CONFLICT(user_id,title) DO UPDATE SET description=EXCLUDED.description RETURNING id INTO v_course;
  IF v_course IS NULL THEN SELECT id INTO v_course FROM courses WHERE user_id=v_user AND title='Research Methods'; END IF;
  INSERT INTO modules(course_id,title) VALUES(v_course,'Research Philosophy') ON CONFLICT(course_id,title) DO NOTHING RETURNING id INTO v_module;
  IF v_module IS NULL THEN SELECT id INTO v_module FROM modules WHERE course_id=v_course AND title='Research Philosophy'; END IF;
  INSERT INTO lectures(module_id,title,lecturer,occurred_at) VALUES(v_module,'Lecture 1','Demo Lecturer',now()-interval '7 days') RETURNING id INTO v_lecture;
  INSERT INTO topics(lecture_id,module_id,title) VALUES(v_lecture,v_module,'Philosophical Foundations') RETURNING id INTO v_topic;
  INSERT INTO concepts(topic_id,module_id,title,importance) VALUES(v_topic,v_module,'Ontology',5) RETURNING id INTO v_ontology;
  INSERT INTO concepts(topic_id,module_id,title,importance) VALUES(v_topic,v_module,'Epistemology',5) RETURNING id INTO v_epistemology;
  INSERT INTO concepts(topic_id,module_id,title,importance) VALUES(v_topic,v_module,'Axiology',4) RETURNING id INTO v_axiology;
  INSERT INTO sources(user_id,title,source_type,course_id,module_id,lecture_id,author_or_lecturer,tags,raw_text,status,is_demo)
  VALUES(v_user,'Research Philosophy — Lecture 1','transcript',v_course,v_module,v_lecture,'Demo Lecturer',ARRAY['ontology','epistemology','axiology'],'Ontology asks what exists. Epistemology examines how knowledge is known. Axiology concerns values and ethics in research.','ready',true) RETURNING id INTO v_source;
  INSERT INTO source_chunks(source_id,chunk_index,content,section_title) VALUES(v_source,0,'Ontology asks what exists and what reality is. Epistemology examines how knowledge can be known and justified. Axiology concerns values and ethics in research.','Philosophical assumptions');
  INSERT INTO mastery_records(user_id,concept_id,state,rolling_score,attempt_count,next_review_at) VALUES
    (v_user,v_ontology,'developing',3.10,3,now()-interval '1 day'),
    (v_user,v_epistemology,'learning',2.20,2,now()),
    (v_user,v_axiology,'exposed',1.40,1,now());
  INSERT INTO academic_tasks(user_id,course_id,title,task_type,deadline,priority,estimated_minutes,actual_minutes,status,progress,notes,is_demo)
  VALUES(v_user,v_course,'Read research philosophy chapter','Reading',now()+interval '2 days','high',120,25,'in_progress',25,'Capture key assumptions and examples.',true);
  INSERT INTO work_projects(user_id,title,description,status,is_demo) VALUES(v_user,'Professional Project Alpha','First Edition demonstration project','in_progress',true) RETURNING id INTO v_project;
  INSERT INTO work_tasks(user_id,project_id,title,deadline,priority,estimated_minutes,actual_minutes,status,progress,notes,is_demo)
  VALUES(v_user,v_project,'Complete quarterly performance report',now()+interval '1 day','critical',420,120,'in_progress',35,'Waiting for one departmental input.',true);
END $$;
